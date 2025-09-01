import { NextRequest, NextResponse } from 'next/server';
import { ethers, getNumber, type Contract } from "ethers";
import { JsonRpcProvider, NonceManager } from "ethers";
import externalRouterAbi from "../../../abi/ExternalRouter.json";
import { 
  OptimismRouter, 
  EthRouter, 
  ZoraRouter, 
  WorldchainRouter, 
  BaseRouter, 
  InkRouter, 
  UnichainRouter, 
  PolygonRouter 
} from "../../../context/constants";

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

interface ProcessingResult {
  success: boolean;
  messagesProcessed: number;
  errors: string[];
  chains: string[];
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
    rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC_URL!,
    chainId: BigInt(420),
    routerAddress: OptimismRouter,
  },
  eth: {
    name: "Ethereum Sepolia", 
    rpcUrl: process.env.ETH_SEPOLIA_RPC_URL!,
    chainId: BigInt(111),
    routerAddress: EthRouter,
  },
  zora: {
    name: "Zora Sepolia",
    rpcUrl: process.env.ZORA_SEPOLIA_RPC_URL!,
    chainId: BigInt(9999),
    routerAddress: ZoraRouter,
  },
  worldchain: {
    name: "Worldchain Sepolia",
    rpcUrl: process.env.WORLDCHAIN_SEPOLIA_RPC_URL!,
    chainId: BigInt(480),
    routerAddress: WorldchainRouter,
  },
  base: {
    name: "Base Sepolia",
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL!,
    chainId: BigInt(845),
    routerAddress: BaseRouter,
  },
  ink: {
    name: "Ink Sepolia",
    rpcUrl: process.env.INK_SEPOLIA_RPC_URL!,
    chainId: BigInt(763),
    routerAddress: InkRouter,
  },
  unichain: {
    name: "Unichain Sepolia",
    rpcUrl: process.env.UNICHAIN_SEPOLIA_RPC_URL!,
    chainId: BigInt(130),
    routerAddress: UnichainRouter,
  },
  polygon: {
    name: "Polygon Amoy",
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL!,
    chainId: BigInt(800),
    routerAddress: PolygonRouter,
  },
} as const;

class TransactionProcessor {
  private providers: Record<ChainType, JsonRpcProvider> = {} as any;
  private wallets: Record<ChainType, NonceManager> = {} as any;
  private routers: Record<ChainType, Contract> = {} as any;
  private isProcessing = false;
  private timeoutId: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeClients();
  }

  private initializeClients(): void {
    console.log("🚀 Initializing transaction processor clients...");

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
    
    // Set source chain ID for lzReceive (where message came from)
    processedMessage[0] = CHAIN_CONFIGS[fromChain].chainId;
    
    // Address handling based on message direction
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

  private async processChainMessages(
    sourceChain: ChainType, 
    targetChains: ChainType[]
  ): Promise<{ processed: number; errors: string[] }> {
    const result = { processed: 0, errors: [] as string[] };
    
    try {
      console.log(`🔄 Checking messages on ${targetChains.join(', ')} ${CHAIN_CONFIGS[sourceChain].name}...`);
      
      const queueLength = getNumber(await this.routers[sourceChain].queueLength());
      
      if (queueLength === 0) {
        console.log(`📭 No messages to process on ${CHAIN_CONFIGS[sourceChain].name}`);
        return result;
      }

      console.log(`📨 Found ${queueLength} messages on ${CHAIN_CONFIGS[sourceChain].name}`);

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
              // Pop skipped messages so they don't get stuck
              await this.routers[sourceChain].pop();
              continue;
            }

            await this.routeMessage(message, sourceChain, targetChain, 0);
          } else {
            // Other chains → Optimism routing
            await this.routeMessage(message, sourceChain, "optimism", 0);
          }

          // Only remove message after successful routing
          await this.routers[sourceChain].pop();
          console.log(`✅ Popped message from ${CHAIN_CONFIGS[sourceChain].name}`);
          result.processed++;
        } catch (error: any) {
          console.error(`❌ Failed to route message ${i + 1}:`, error);
          result.errors.push(`${CHAIN_CONFIGS[sourceChain].name}: ${error.message || error}`);
          // Don't pop on failure - will retry on next call
          break; // Exit loop to avoid processing same message repeatedly
        }
      }

      console.log(`🎉 Processed ${result.processed} messages on ${CHAIN_CONFIGS[sourceChain].name}`);
    } catch (error: any) {
      console.error(`❌ Error processing ${sourceChain} messages:`, error);
      result.errors.push(`${CHAIN_CONFIGS[sourceChain].name}: ${error.message || error}`);
    }
    
    return result;
  }

  public async detectAndProcessTransactions(timeoutMs: number = 60000): Promise<ProcessingResult> {
    if (this.isProcessing) {
      throw new Error("Transaction processing already in progress");
    }

    this.isProcessing = true;
    let totalProcessed = 0;
    const allErrors: string[] = [];
    const processedChains: string[] = [];

    console.log(`🎯 Starting transaction detection and processing (timeout: ${timeoutMs}ms)...`);

    try {
      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        this.timeoutId = setTimeout(() => {
          reject(new Error(`Processing timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      // Process all chains
      const processingPromise = (async () => {
        // Check for messages on all chains
        const chains: ChainType[] = ["optimism", "eth", "zora", "worldchain", "base", "ink", "unichain", "polygon"];
        let hasAnyMessages = false;
        
        for (const chain of chains) {
          if (!this.isProcessing) break; // Early exit if stopped
          
          try {
            const result = await this.processChainMessages(
              chain, 
              chain === "optimism" 
                ? ["eth", "zora", "worldchain", "base", "ink", "unichain", "polygon"]
                : ["optimism"]
            );
            
            if (result.processed > 0) {
              hasAnyMessages = true;
              totalProcessed += result.processed;
              processedChains.push(CHAIN_CONFIGS[chain].name);
            }
            
            if (result.errors.length > 0) {
              allErrors.push(...result.errors);
            }
          } catch (error: any) {
            console.error(`❌ Error processing ${chain}:`, error);
            allErrors.push(`${CHAIN_CONFIGS[chain].name}: ${error.message || error}`);
          }
        }
        
        // If no messages found on any chain, exit early
        if (!hasAnyMessages) {
          console.log("📭 No messages found on any chain, completing processing early");
          return;
        }
      })();

      // Wait for either processing to complete or timeout
      await Promise.race([processingPromise, timeoutPromise]);

      // Clear timeout if processing completed first
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }

    } catch (error: any) {
      if (error.message.includes('timeout')) {
        console.log(`⏰ Processing completed with timeout: ${totalProcessed} messages processed`);
      } else {
        console.error('❌ Processing error:', error);
        allErrors.push(`General error: ${error.message || error}`);
      }
    } finally {
      this.isProcessing = false;
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
    }

    const result: ProcessingResult = {
      success: totalProcessed > 0,
      messagesProcessed: totalProcessed,
      errors: allErrors,
      chains: processedChains
    };

    console.log(`🏁 Processing complete:`, result);
    return result;
  }

  public stop(): void {
    console.log("🛑 Stopping transaction processor...");
    this.isProcessing = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

// API Route Handler
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse request body for optional timeout
    const body = await request.json().catch(() => ({}));
    const timeoutMs = body.timeout || 60000; // Default 1 minute

    console.log(`🚀 LayerZero Call API triggered with ${timeoutMs}ms timeout`);

    // Create processor instance
    const processor = new TransactionProcessor();

    // Process transactions with timeout
    const result = await processor.detectAndProcessTransactions(timeoutMs);

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Return results
    return NextResponse.json({
      success: true,
      result,
      processingTime,
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ API Error:', error);
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error occurred',
      processingTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    message: 'LayerZero Call API is ready',
    timestamp: new Date().toISOString()
  });
}
