/**
 * Client utility for calling the LayerZero Call API
 * This handles communication with your transaction processing endpoint
 */

export interface ProcessingResult {
  success: boolean;
  messagesProcessed: number;
  errors: string[];
  chains: string[];
}

export interface ApiResponse {
  success: boolean;
  result?: ProcessingResult;
  error?: string;
  processingTime: number;
  timestamp: string;
}

export class RelayerClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    // Default to current origin in browser, localhost in development
    this.baseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  }

  /**
   * Trigger transaction processing with optional timeout
   * @param timeoutMs - Maximum processing time in milliseconds (default: 60000 = 1 minute)
   * @returns Promise<ApiResponse>
   */
  async processTransactions(timeoutMs: number = 60000): Promise<ApiResponse> {
    try {
      console.log(`🚀 Triggering LayerZero transaction processing (timeout: ${timeoutMs}ms)...`);

      const response = await fetch(`${this.baseUrl}/api/layerZeroCall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timeout: timeoutMs }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse = await response.json();
      
      if (result.success && result.result) {
        console.log(`✅ Processing completed:`, {
          messagesProcessed: result.result.messagesProcessed,
          chains: result.result.chains,
          processingTime: result.processingTime
        });
        
        if (result.result.errors.length > 0) {
          console.warn(`⚠️  Processing completed with errors:`, result.result.errors);
        }
      } else {
        console.error(`❌ Processing failed:`, result.error);
      }

      return result;
    } catch (error: any) {
      console.error('❌ Failed to trigger transaction processing:', error);
      throw error;
    }
  }

  /**
   * Check API health status
   * @returns Promise<boolean>
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/layerZeroCall`, {
        method: 'GET',
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return false;
    }
  }

  /**
   * Process transactions automatically on user actions
   * This is designed to be called after deposit/withdrawal transactions
   * @param maxRetries - Maximum number of retry attempts
   * @param retryDelay - Delay between retries in milliseconds
   * @returns Promise<boolean> - true if any messages were processed
   */
  async processOnUserAction(
    maxRetries: number = 3, 
    retryDelay: number = 5000
  ): Promise<boolean> {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        console.log(`🔄 Processing attempt ${attempt + 1}/${maxRetries}...`);
        
        const result = await this.processTransactions(60000); // 1 minute timeout
        
        if (result.success && result.result && result.result.messagesProcessed > 0) {
          console.log(`🎉 Successfully processed ${result.result.messagesProcessed} messages!`);
          return true;
        }
        
        if (!result.success) {
          throw new Error(result.error || 'Processing failed');
        }
        
        // No messages found, wait and retry
        if (attempt < maxRetries - 1) {
          console.log(`📭 No messages found, retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        
      } catch (error: any) {
        console.error(`❌ Attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt < maxRetries - 1) {
          console.log(`🔄 Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
      
      attempt++;
    }
    
    console.log(`⏰ No messages processed after ${maxRetries} attempts`);
    return false;
  }
}

// Export a default instance for convenience
export const relayerClient = new RelayerClient();

// Example usage functions
export const examples = {
  /**
   * Example: Process transactions immediately
   */
  async processNow() {
    try {
      const result = await relayerClient.processTransactions(60000);
      return result;
    } catch (error) {
      console.error('Failed to process transactions:', error);
      throw error;
    }
  },

  /**
   * Example: Process after user deposit/withdrawal
   */
  async processAfterUserAction() {
    try {
      const success = await relayerClient.processOnUserAction(3, 5000);
      if (success) {
        console.log('✅ Cross-chain message processing completed successfully!');
      } else {
        console.log('📭 No cross-chain messages found to process');
      }
      return success;
    } catch (error) {
      console.error('Failed to process after user action:', error);
      throw error;
    }
  }
};
