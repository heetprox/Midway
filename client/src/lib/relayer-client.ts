// Relayer client - adapts server logic for Next.js API use
import { ethers, getNumber, type Contract, type Wallet } from "ethers";
import { JsonRpcProvider, NonceManager } from "ethers";
import { PendingTransaction } from './transaction-queue';

// Import your router addresses from constants
const externalRouterAbi = {
  "abi": [
    {
      "type": "function",
      "name": "route",
      "inputs": [
        {
          "name": "message",
          "type": "tuple",
          "components": [
            {"name": "chainId", "type": "uint256"},
            {"name": "addressCombination", "type": "bytes32"},
            {"name": "payload", "type": "bytes"}
          ]
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    }
  ]
}; // You'll need to import your actual ABI

// Types
type ChainType = "optimism" | "eth" | "zora" | "worldchain" | "base" | "ink" | "unichain" | "polygon";

interface ChainConfig {
  name: string;
  rpcUrl: string;
  chainId: bigint;
  routerAddress: string;
}

// Chain configurations - you'll need to set these up with your environment variables
const CHAIN_CONFIGS: Record<ChainType, ChainConfig> = {
  optimism: {
    name: "Optimism Sepolia",
    rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC_URL!,
    chainId: 420n,
    routerAddress: "0x36a20A8b577dE1Cf06d66193dcA99c0BF3Dec1b6", // From your constants
  },
  eth: {
    name: "Ethereum Sepolia", 
    rpcUrl: process.env.ETH_SEPOLIA_RPC_URL!,
    chainId: 111n,
    routerAddress: "0x172Bd850a824aBD2Da83C639AA48BE7F73d7e2F2",
  },
  zora: {
    name: "Zora Sepolia",
    rpcUrl: process.env.ZORA_SEPOLIA_RPC_URL!,
    chainId: 9999n,
    routerAddress: "0x6c99AC35d4cCc171eF2008b93Bd5432D884E0267",
  },
  worldchain: {
    name: "Worldchain Sepolia",
    rpcUrl: process.env.WORLDCHAIN_SEPOLIA_RPC_URL!,
    chainId: 480n,
    routerAddress: "0xFD8A5e2D68A9fB6a9F9e1a727E5C51ba020c837b",
  },
  base: {
    name: "Base Sepolia",
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL!,
    chainId: 845n,
    routerAddress: "0x7AeC83cEC21521Fc883D5C02816cBB09c52919a7",
  },
  ink: {
    name: "Ink Sepolia",
    rpcUrl: process.env.INK_SEPOLIA_RPC_URL!,
    chainId: 763n,
    routerAddress: "0x7AeC83cEC21521Fc883D5C02816cBB09c52919a7",
  },
  unichain: {
    name: "Unichain Sepolia",
    rpcUrl: process.env.UNICHAIN_SEPOLIA_RPC_URL!,
    chainId: 130n,
    routerAddress: "0xfe10DE969f5653D07FA3D486B286d4Da72082E7A",
  },
  polygon: {
    name: "Polygon Amoy",
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL!,
    chainId: 800n,
    routerAddress: "0x73bdb7a3c1DD24E3b109DE0856CDF4577431aB76",
  },
} as const;

class RelayerClient {
  private providers: Record<ChainType, JsonRpcProvider> = {} as any;
  private wallets: Record<ChainType, NonceManager> = {} as any;
  private routers: Record<ChainType, Contract> = {} as any;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.initialized) return;

    const BOT_PRIVATE_KEY = process.env.BOT_PRIVATE_KEY;
    if (!BOT_PRIVATE_KEY) {
      throw new Error("BOT_PRIVATE_KEY environment variable is required");
    }

    console.log("🚀 Initializing relayer client...");

    for (const [chain, config] of Object.entries(CHAIN_CONFIGS) as [ChainType, ChainConfig][]) {
      try {
        // Initialize provider
        this.providers[chain] = new JsonRpcProvider(config.rpcUrl);
        
        // Initialize wallet with nonce manager
        const wallet = new ethers.Wallet(BOT_PRIVATE_KEY, this.providers[chain]);
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

    this.initialized = true;
  }

  private replaceSenderAndReceiver(hexString: string): string {
    let cleaned = hexString.replace("0x", "");
    const halfLength = cleaned.length / 2;
    cleaned = cleaned.slice(halfLength) + cleaned.slice(0, halfLength);
    return `0x${cleaned}`;
  }

  private processMessageData(transaction: PendingTransaction): any {
    const { chainFrom, messageData } = transaction;
    
    if (!messageData) {
      throw new Error("Message data is required");
    }

    const processedMessage = { ...messageData };
    
    // Set source chain ID for lzReceive (where message came from)
    processedMessage.chainId = CHAIN_CONFIGS[chainFrom as ChainType].chainId;
    
    // Address handling based on message direction
    if (chainFrom === "optimism") {
      // Optimism → Client: swap addresses for return path
      processedMessage.addressCombination = this.replaceSenderAndReceiver(messageData.addressCombination);
    } else {
      // Client → Optimism: addresses from MidPayClient are in wrong order, need to swap
      processedMessage.addressCombination = this.replaceSenderAndReceiver(messageData.addressCombination);
    }
    
    return processedMessage;
  }

  public async routeTransaction(transaction: PendingTransaction): Promise<string> {
    this.initialize(); // Ensure initialized

    const { chainFrom, chainTo } = transaction;
    
    console.log(`🚀 Processing transaction: ${chainFrom} → ${chainTo}`);
    
    const processedMessage = this.processMessageData(transaction);
    
    // Convert to proper struct format for the contract
    const messageStruct = {
      chainId: processedMessage.chainId,
      addressCombination: processedMessage.addressCombination,
      payload: processedMessage.payload || "0x"
    };
    
    const router = this.routers[chainTo as ChainType];
    const config = CHAIN_CONFIGS[chainTo as ChainType];
    
    if (!router || !config) {
      throw new Error(`Unsupported destination chain: ${chainTo}`);
    }
    
    // Execute the routing transaction
    const tx = await router.route(messageStruct);
    await tx.wait();
    
    console.log(`✅ Transaction routed to ${config.name} - TX: ${tx.hash}`);
    return tx.hash;
  }
}

// Singleton instance
let relayerClient: RelayerClient | null = null;

export async function processTransaction(transaction: PendingTransaction): Promise<string> {
  if (!relayerClient) {
    relayerClient = new RelayerClient();
  }
  
  return await relayerClient.routeTransaction(transaction);
}
