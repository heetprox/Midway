import { ethers, getNumber, type Contract, type Wallet } from "ethers";
import { JsonRpcProvider, NonceManager } from "ethers";
import externalRouterAbi from "./abi/ExternalRouter.json";
import { EthRouter, ModeRouter, OptimismRouter, ZoraRouter } from "./constants";

// Types
type ChainType = "optimism" | "zora" | "mode" | "eth";
type DestinationChain = "zora" | "mode" | "eth";

interface ChainConfig {
  name: string;
  rpcUrl: string;
  chainId: bigint;
  routerAddress: string;
}

interface MessageData {
  [key: number]: string | bigint;
  0: bigint; 
  1: string;
}

// Environment configuration
const BOT_PRIVATE_KEY = process.env.BOT_PRIVATE_KEY;

if (!BOT_PRIVATE_KEY) {
  throw new Error("BOT_PRIVATE_KEY environment variable is required");
}

// Chain configurations
const CHAIN_CONFIGS: Record<ChainType, ChainConfig> = {
  optimism: {
    name: "Optimism Sepolia",
    rpcUrl: "https://sepolia.optimism.io",
    chainId: 10132n,
    routerAddress: OptimismRouter,
  },
  zora: {
    name: "Zora Sepolia",
    rpcUrl: "https://sepolia.rpc.zora.energy",
    chainId: 9999n,
    routerAddress: ZoraRouter,
  },
  mode: {
    name: "Mode Sepolia",
    rpcUrl: "https://sepolia.mode.network",
    chainId: 9998n,
    routerAddress: ModeRouter,
  },
  eth: {
    name: "Ethereum Sepolia",
    rpcUrl: "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    chainId: 11155111n,
    routerAddress: EthRouter,
  },
} as const;

class CrossChainRelayer {
  private providers: Record<ChainType, JsonRpcProvider> = {} as any;
  private wallets: Record<ChainType, NonceManager> = {} as any;
  private routers: Record<ChainType, Contract> = {} as any;
  private isRunning = false;

  constructor() {
    this.initializeClients();
  }

  private initializeClients(): void {
    console.log("🚀 Initializing cross-chain clients...");

    for (const [chain, config] of Object.entries(CHAIN_CONFIGS) as [ChainType, ChainConfig][]) {
      try {
        // Initialize provider
        this.providers[chain] = new JsonRpcProvider(config.rpcUrl);
        
        // Initialize wallet with nonce manager
        const wallet = new ethers.Wallet(BOT_PRIVATE_KEY!, this.providers[chain]);
        this.wallets[chain] = new NonceManager(wallet);
        
        // Initialize router contract
        this.routers[chain] = new ethers.Contract(
          config.routerAddress,
          externalRouterAbi.abi,
          this.wallets[chain]
        );

        console.log(`✅ ${config.name} client initialized`);
      } catch (error) {
        console.error(`❌ Failed to initialize ${config.name}:`, error);
        throw error;
      }
    }
  }

  private replaceSenderAndReceiver(hexString: string): string {
    let cleaned = hexString.replace("0x", "");
    const halfLength = cleaned.length / 2;
    cleaned = cleaned.slice(halfLength) + cleaned.slice(0, halfLength);
    return `0x${cleaned}`;
  }

  private processMessage(message: MessageData, fromChain: ChainType): MessageData {
    const processedMessage = { ...message } as MessageData;
    
    // Update chain ID based on source
    processedMessage[0] = CHAIN_CONFIGS[fromChain].chainId;
    
    // Transform sender/receiver addresses
    processedMessage[1] = this.replaceSenderAndReceiver(message[1]);
    
    return processedMessage;
  }

  private getDestinationChain(chainId: bigint): DestinationChain | null {
    if (chainId === CHAIN_CONFIGS.zora.chainId) return "zora";
    if (chainId === CHAIN_CONFIGS.mode.chainId) return "mode";
    return null;
  }

  private async processQueuedMessages(): Promise<void> {
    console.log("\n📥 Processing queued messages...");

    // Process Optimism → Zora/Mode messages
    await this.processChainMessages("optimism", ["zora", "mode"]);
    
    // Process Zora → Optimism messages
    await this.processChainMessages("zora", ["optimism"]);
    
    // Process Mode → Optimism messages
    await this.processChainMessages("mode", ["optimism"]);
  }

  private async processChainMessages(
    sourceChain: ChainType, 
    targetChains: ChainType[]
  ): Promise<void> {
    try {
      console.log(`🔄 Processing messages on ${CHAIN_CONFIGS[sourceChain].name}...`);
      
      const queueLength = getNumber(await this.routers[sourceChain].queueLength());
      
      if (queueLength === 0) {
        console.log(`📭 No messages to process on ${CHAIN_CONFIGS[sourceChain].name}`);
        return;
      }

      // Process messages from newest to oldest
      for (let i = queueLength - 1; i >= 0; i--) {
        const message: MessageData = await this.routers[sourceChain].messageQueue(i);
        console.log(`📨 Processing message ${i + 1}/${queueLength}:`, message);

        if (sourceChain === "optimism") {
          // Optimism → Zora/Mode routing
          const targetChain = this.getDestinationChain(message[0]);
          
          if (!targetChain) {
            console.log("⏭️  Message not for supported chains, skipping...");
            continue;
          }

          await this.routeMessage(message, sourceChain, targetChain);
        } else {
          // Zora/Mode → Optimism routing
          await this.routeMessage(message, sourceChain, "optimism");
        }

        // Remove processed message
        await this.routers[sourceChain].pop();
        console.log(`✅ Popped message from ${CHAIN_CONFIGS[sourceChain].name}`);
      }

      console.log(`🎉 Processed ${queueLength} messages on ${CHAIN_CONFIGS[sourceChain].name}`);
    } catch (error) {
      console.error(`❌ Error processing ${sourceChain} messages:`, error);
      throw error;
    }
  }

  private async routeMessage(
    message: MessageData,
    fromChain: ChainType,
    toChain: ChainType
  ): Promise<void> {
    try {
      const processedMessage = this.processMessage(message, fromChain);
      
      console.log(`🚀 Routing message: ${CHAIN_CONFIGS[fromChain].name} → ${CHAIN_CONFIGS[toChain].name}`);
      
      const tx = await this.routers[toChain].route(processedMessage);
      await tx.wait();
      
      console.log(`✅ Message routed to ${CHAIN_CONFIGS[toChain].name} - TX: ${tx.hash}`);
    } catch (error) {
      console.error(`❌ Failed to route message to ${toChain}:`, error);
      throw error;
    }
  }

  private async setupEventListeners(): Promise<void> {
    console.log("👂 Setting up event listeners...");

    // Optimism events → Zora/Mode
    this.routers.optimism.on("MessageSent", async (message: MessageData) => {
      try {
        console.log("🔴 Received message from Optimism:", message);
        
        const targetChain = this.getDestinationChain(message[0]);
        if (!targetChain) {
          console.log("⏭️  Message not for supported chains, skipping...");
          return;
        }

        await this.routeMessage(message, "optimism", targetChain);
        await this.routers.optimism.pop();
        console.log("✅ Processed Optimism message");
      } catch (error) {
        console.error("❌ Error processing Optimism event:", error);
      }
    });

    // Zora events → Optimism
    this.routers.zora.on("MessageSent", async (message: MessageData) => {
      try {
        console.log("🪩 Received message from Zora:", message);
        
        await this.routeMessage(message, "zora", "optimism");
        await this.routers.zora.pop();
        console.log("✅ Processed Zora message");
      } catch (error) {
        console.error("❌ Error processing Zora event:", error);
      }
    });

    // Mode events → Optimism
    this.routers.mode.on("MessageSent", async (message: MessageData) => {
      try {
        console.log("🌐 Received message from Mode:", message);
        
        await this.routeMessage(message, "mode", "optimism");
        await this.routers.mode.pop();
        console.log("✅ Processed Mode message");
      } catch (error) {
        console.error("❌ Error processing Mode event:", error);
      }
    });

    console.log("✅ Event listeners configured");
  }

  private async removeAllListeners(): Promise<void> {
    console.log("🧹 Removing existing event listeners...");
    
    await this.routers.optimism.removeAllListeners();
    await this.routers.zora.removeAllListeners();
    await this.routers.mode.removeAllListeners();
    
    console.log("✅ Event listeners removed");
  }

  private async checkWalletBalances(): Promise<void> {
    console.log("\n💰 Checking wallet balances...");
    
    for (const [chain, wallet] of Object.entries(this.wallets) as [ChainType, NonceManager][]) {
      try {
        const balance = await wallet.provider?.getBalance(wallet.getAddress());
        const balanceEth = balance ? ethers.formatEther(balance) : "0";
        
        console.log(`${CHAIN_CONFIGS[chain as ChainType].name}: ${balanceEth} ETH`);
        
        if (parseFloat(balanceEth) < 0.001) {
          console.warn(`⚠️  Low balance on ${CHAIN_CONFIGS[chain as ChainType].name}!`);
        }
      } catch (error) {
        console.error(`❌ Failed to check balance for ${chain}:`, error);
      }
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️  Relayer is already running");
      return;
    }

    try {
      console.log("🎯 Starting MIDPAY Cross-Chain Relayer...");
      
      this.isRunning = true;
      
      // Check wallet balances
      await this.checkWalletBalances();
      
      // Remove existing listeners
      await this.removeAllListeners();
      
      // Setup new event listeners
      await this.setupEventListeners();
      
      // Process any queued messages
      await this.processQueuedMessages();
      
      console.log("🚀 MIDPAY Relayer is now running and listening for messages!");
      
    } catch (error) {
      console.error("❌ Failed to start relayer:", error);
      this.isRunning = false;
      
      // Retry after 5 seconds
      setTimeout(() => {
        console.log("🔄 Retrying in 5 seconds...");
        this.start();
      }, 5000);
    }
  }

  public async stop(): Promise<void> {
    console.log("🛑 Stopping MIDPAY Relayer...");
    
    this.isRunning = false;
    await this.removeAllListeners();
    
    console.log("✅ MIDPAY Relayer stopped");
  }
}

// Main execution
async function main(): Promise<void> {
  console.log("🎉 MIDPAY Cross-Chain Relayer v1.0");
  console.log("=" .repeat(50));
  
  const relayer = new CrossChainRelayer();
  
  // Graceful shutdown handlers
  process.on('SIGINT', async () => {
    console.log("\n🛑 Received SIGINT, shutting down gracefully...");
    await relayer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
    await relayer.stop();
    process.exit(0);
  });

  // Start the relayer
  await relayer.start();
  
  // Restart every 5 minutes to handle connection drops
  setInterval(async () => {
    console.log("\n🔄 Periodic restart to maintain connections...");
    await relayer.stop();
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second pause
    await relayer.start();
  }, 5 * 60 * 1000); // 5 minutes
}

// Error handling for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Start the application
await main();