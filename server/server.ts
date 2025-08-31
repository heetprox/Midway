import { ethers, getNumber, type Contract, type Wallet } from "ethers";
import { JsonRpcProvider, NonceManager } from "ethers";
import externalRouterAbi from "./abi/ExternalRouter.json";
import { 
  EthRouter, 
  OptimismRouter, 
  ZoraRouter, 
  WorldchainRouter, 
  BaseRouter, 
  InkRouter, 
  UnichainRouter, 
  PolygonRouter 
} from "./constants";

// Types
type ChainType = "optimism" | "eth" | "zora" | "worldchain" | "base" | "ink" | "unichain" | "polygon";
type DestinationChain = "eth" | "zora" | "worldchain" | "base" | "ink" | "unichain" | "polygon";

interface ChainConfig {
  name: string;
  rpcUrl: string;
  chainId: bigint;
  routerAddress: string;
}

interface MessageData {
  [key: number]: string | bigint | undefined;
  0: bigint; // chainId
  1: string; // addressCombination
  2?: string; // payload (optional)
}

// Environment configuration
const BOT_PRIVATE_KEY = process.env.BOT_PRIVATE_KEY;

if (!BOT_PRIVATE_KEY) {
  throw new Error("BOT_PRIVATE_KEY environment variable is required");
}

// Chain configurations - Updated with new networks
const CHAIN_CONFIGS: Record<ChainType, ChainConfig> = {
  optimism: {
    name: "Optimism Sepolia",
    rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC_URL!,
    chainId: 420n, // ExternalRouter chain ID
    routerAddress: OptimismRouter,
  },
  eth: {
    name: "Ethereum Sepolia",
    rpcUrl: process.env.ETH_SEPOLIA_RPC_URL!,
    chainId: 111n, // ExternalRouter chain ID
    routerAddress: EthRouter,
  },
  zora: {
    name: "Zora Sepolia",
    rpcUrl: process.env.ZORA_SEPOLIA_RPC_URL!,
    chainId: 9999n, // ExternalRouter chain ID
    routerAddress: ZoraRouter,
  },
  worldchain: {
    name: "Worldchain Sepolia",
    rpcUrl: process.env.WORLDCHAIN_SEPOLIA_RPC_URL!,
    chainId: 480n, // ExternalRouter chain ID
    routerAddress: WorldchainRouter,
  },
  base: {
    name: "Base Sepolia",
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL!,
    chainId: 845n, // ExternalRouter chain ID
    routerAddress: BaseRouter,
  },
  ink: {
    name: "Ink Sepolia",
    rpcUrl: process.env.INK_SEPOLIA_RPC_URL!,
    chainId: 763n, // ExternalRouter chain ID
    routerAddress: InkRouter,
  },
  unichain: {
    name: "Unichain Sepolia",
    rpcUrl: process.env.UNICHAIN_SEPOLIA_RPC_URL!,
    chainId: 130n, // ExternalRouter chain ID
    routerAddress: UnichainRouter,
  },
  polygon: {
    name: "Polygon Amoy",
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL!,
    chainId: 800n, // ExternalRouter chain ID
    routerAddress: PolygonRouter,
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
    
    // FIXED: Set source chain ID for lzReceive (where message came from)
    processedMessage[0] = CHAIN_CONFIGS[fromChain].chainId;
    
    // FIXED: Address handling based on message direction
    if (fromChain === "optimism") {
      // Optimism → Client: swap addresses for return path
      processedMessage[1] = this.replaceSenderAndReceiver(message[1]);
    } else {
      // Client → Optimism: addresses from MidPayClient are in wrong order, need to swap
      processedMessage[1] = this.replaceSenderAndReceiver(message[1]);
    }
    
    return processedMessage;
  }

  private getDestinationChain(chainId: bigint): DestinationChain | null {
    if (chainId === CHAIN_CONFIGS.eth.chainId) return "eth";
    if (chainId === CHAIN_CONFIGS.zora.chainId) return "zora";
    if (chainId === CHAIN_CONFIGS.worldchain.chainId) return "worldchain";
    if (chainId === CHAIN_CONFIGS.base.chainId) return "base";
    if (chainId === CHAIN_CONFIGS.ink.chainId) return "ink";
    if (chainId === CHAIN_CONFIGS.unichain.chainId) return "unichain";
    if (chainId === CHAIN_CONFIGS.polygon.chainId) return "polygon";
    return null;
  }

  private async processQueuedMessages(): Promise<void> {
    console.log("\n📥 Processing queued messages...");

    // Process Optimism → All other chains messages
    await this.processChainMessages("optimism", ["eth", "zora", "worldchain", "base", "ink", "unichain", "polygon"]);
    
    // Process messages from other chains → Optimism
    await this.processChainMessages("eth", ["optimism"]);
    await this.processChainMessages("zora", ["optimism"]);
    await this.processChainMessages("worldchain", ["optimism"]);
    await this.processChainMessages("base", ["optimism"]);
    await this.processChainMessages("ink", ["optimism"]);
    await this.processChainMessages("unichain", ["optimism"]);
    await this.processChainMessages("polygon", ["optimism"]);
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

        try {
          if (sourceChain === "optimism") {
            // Optimism → Other chains routing
            const targetChain = this.getDestinationChain(message[0]);
            
            if (!targetChain) {
              console.log("⏭️  Message not for supported chains, skipping...");
              // FIXED: Pop skipped messages so they don't get stuck
              await this.routers[sourceChain].pop();
              continue;
            }

            await this.routeMessage(message, sourceChain, targetChain, 0);
          } else {
            // Other chains → Optimism routing
            await this.routeMessage(message, sourceChain, "optimism", 0);
          }

          // FIXED: Only remove message after successful routing
          await this.routers[sourceChain].pop();
          console.log(`✅ Popped message from ${CHAIN_CONFIGS[sourceChain].name}`);
        } catch (error) {
          console.error(`❌ Failed to route message ${i + 1} after retries:`, error);
          // FIXED: Don't pop on failure - will retry on next cycle
          break; // Exit loop to avoid processing same message repeatedly
        }
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
    toChain: ChainType,
    retryCount = 0
  ): Promise<void> {
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds
    
    try {
      const processedMessage = this.processMessage(message, fromChain);
      
      console.log(`🚀 Routing message: ${CHAIN_CONFIGS[fromChain].name} → ${CHAIN_CONFIGS[toChain].name}`);
      
      // Convert to proper struct format for the contract
      const messageStruct = {
        chainId: processedMessage[0],
        addressCombination: processedMessage[1],
        payload: processedMessage[2] || "0x"
      };
      
      const tx = await this.routers[toChain].route(messageStruct);
      await tx.wait();
      
      console.log(`✅ Message routed to ${CHAIN_CONFIGS[toChain].name} - TX: ${tx.hash}`);
    } catch (error: any) {
      const isRetryableError = this.isRetryableError(error);
      
      if (isRetryableError && retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        console.warn(`⚠️  Retryable error routing to ${toChain} (attempt ${retryCount + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`);
        console.warn(`Error: ${error.message || error}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.routeMessage(message, fromChain, toChain, retryCount + 1);
      }
      
      console.error(`❌ Failed to route message to ${toChain} after ${retryCount + 1} attempts:`, error);
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    const errorCode = error.code;
    
    // Retry on network errors, RPC errors, and temporary service issues
    const retryableConditions = [
      errorMessage.includes('503 Service Unavailable'),
      errorMessage.includes('502 Bad Gateway'),
      errorMessage.includes('504 Gateway Timeout'),
      errorMessage.includes('Internal server error'),
      errorMessage.includes('Forwarder error'),
      errorMessage.includes('network error'),
      errorMessage.includes('timeout'),
      errorCode === 'SERVER_ERROR',
      errorCode === 'NETWORK_ERROR',
      errorCode === 'TIMEOUT'
    ];
    
    return retryableConditions.some(condition => condition);
  }

  private async setupEventListeners(): Promise<void> {
    console.log("👂 Setting up event listeners...");

    // Optimism events → Other chains
    this.routers.optimism.on("MessageSent", async (message: MessageData) => {
      try {
        console.log("🔴 Received message from Optimism:", message);
        
        const targetChain = this.getDestinationChain(message[0]);
        if (!targetChain) {
          console.log("⏭️  Message not for supported chains, skipping...");
          return;
        }

        await this.routeMessage(message, "optimism", targetChain, 0);
        // FIXED: Only pop after successful routing
        await this.routers.optimism.pop();
        console.log("✅ Processed Optimism message");
      } catch (error) {
        console.error("❌ Error processing Optimism event:", error);
        // FIXED: Don't pop on failure - message stays in queue for retry
      }
    });

    // Eth events → Optimism
    this.routers.eth.on("MessageSent", async (message: MessageData) => {
      try {
        console.log("⚡ Received message from Eth:", message);
        
        await this.routeMessage(message, "eth", "optimism", 0);
        // FIXED: Only pop after successful routing
        await this.routers.eth.pop();
        console.log("✅ Processed Eth message");
      } catch (error) {
        console.error("❌ Error processing Eth event:", error);
        // FIXED: Don't pop on failure - message stays in queue for retry
      }
    });

    // Zora events → Optimism
    this.routers.zora.on("MessageSent", async (message: MessageData) => {
      try {
        console.log("🪩 Received message from Zora:", message);
        
        await this.routeMessage(message, "zora", "optimism", 0);
        // FIXED: Only pop after successful routing
        await this.routers.zora.pop();
        console.log("✅ Processed Zora message");
      } catch (error) {
        console.error("❌ Error processing Zora event:", error);
        // FIXED: Don't pop on failure - message stays in queue for retry
      }
    });

    // Worldchain events → Optimism
    this.routers.worldchain.on("MessageSent", async (message: MessageData) => {
      try {
        console.log("🌍 Received message from Worldchain:", message);
        
        await this.routeMessage(message, "worldchain", "optimism", 0);
        // FIXED: Only pop after successful routing
        await this.routers.worldchain.pop();
        console.log("✅ Processed Worldchain message");
      } catch (error) {
        console.error("❌ Error processing Worldchain event:", error);
        // FIXED: Don't pop on failure - message stays in queue for retry
      }
    });

    // Base events → Optimism
    this.routers.base.on("MessageSent", async (message: MessageData) => {
      try {
        console.log("🔵 Received message from Base:", message);
        
        await this.routeMessage(message, "base", "optimism", 0);
        // FIXED: Only pop after successful routing
        await this.routers.base.pop();
        console.log("✅ Processed Base message");
      } catch (error) {
        console.error("❌ Error processing Base event:", error);
        // FIXED: Don't pop on failure - message stays in queue for retry
      }
    });

    // Ink events → Optimism
    this.routers.ink.on("MessageSent", async (message: MessageData) => {
      try {
        console.log("🖋️ Received message from Ink:", message);
        
        await this.routeMessage(message, "ink", "optimism", 0);
        // FIXED: Only pop after successful routing
        await this.routers.ink.pop();
        console.log("✅ Processed Ink message");
      } catch (error) {
        console.error("❌ Error processing Ink event:", error);
        // FIXED: Don't pop on failure - message stays in queue for retry
      }
    });

    // Unichain events → Optimism
    this.routers.unichain.on("MessageSent", async (message: MessageData) => {
      try {
        console.log("🦄 Received message from Unichain:", message);
        
        await this.routeMessage(message, "unichain", "optimism", 0);
        // FIXED: Only pop after successful routing
        await this.routers.unichain.pop();
        console.log("✅ Processed Unichain message");
      } catch (error) {
        console.error("❌ Error processing Unichain event:", error);
        // FIXED: Don't pop on failure - message stays in queue for retry
      }
    });

    // Polygon events → Optimism
    this.routers.polygon.on("MessageSent", async (message: MessageData) => {
      try {
        console.log("🔺 Received message from Polygon:", message);
        
        await this.routeMessage(message, "polygon", "optimism", 0);
        // FIXED: Only pop after successful routing
        await this.routers.polygon.pop();
        console.log("✅ Processed Polygon message");
      } catch (error) {
        console.error("❌ Error processing Polygon event:", error);
        // FIXED: Don't pop on failure - message stays in queue for retry
      }
    });

    console.log("✅ Event listeners configured");
  }

  private async removeAllListeners(): Promise<void> {
    console.log("🧹 Removing existing event listeners...");
    
    await this.routers.optimism.removeAllListeners();
    await this.routers.eth.removeAllListeners();
    await this.routers.zora.removeAllListeners();
    await this.routers.worldchain.removeAllListeners();
    await this.routers.base.removeAllListeners();
    await this.routers.ink.removeAllListeners();
    await this.routers.unichain.removeAllListeners();
    await this.routers.polygon.removeAllListeners();
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