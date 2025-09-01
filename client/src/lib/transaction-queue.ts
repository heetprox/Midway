// Transaction Queue System for reliable cross-chain processing
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface PendingTransaction {
  id: string;
  chainFrom: string;
  chainTo: string;
  userAddress: string;
  amount: string;
  timestamp: number;
  retryCount: number;
  lastAttempt: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: string;
  errorMessage?: string;
  messageData?: {
    chainId: bigint;
    addressCombination: string;
    payload?: string;
  };
}

class TransactionQueue {
  private queueFile = join(process.cwd(), 'data', 'transaction-queue.json');
  private maxRetries = 5;
  private retryDelay = 2000; // 2 seconds base delay

  constructor() {
    this.ensureQueueFile();
  }

  private ensureQueueFile(): void {
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(dataDir, { recursive: true });
    }
    
    if (!existsSync(this.queueFile)) {
      writeFileSync(this.queueFile, JSON.stringify([], null, 2));
    }
  }

  private readQueue(): PendingTransaction[] {
    try {
      const data = readFileSync(this.queueFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading queue file:', error);
      return [];
    }
  }

  private writeQueue(transactions: PendingTransaction[]): void {
    try {
      writeFileSync(this.queueFile, JSON.stringify(transactions, null, 2));
    } catch (error) {
      console.error('Error writing queue file:', error);
      throw error;
    }
  }

  // Add new transaction to queue
  public addTransaction(tx: Omit<PendingTransaction, 'id' | 'timestamp' | 'retryCount' | 'lastAttempt' | 'status'>): string {
    const transactions = this.readQueue();
    
    const newTx: PendingTransaction = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      lastAttempt: 0,
      status: 'pending'
    };

    transactions.push(newTx);
    this.writeQueue(transactions);
    
    console.log(`📥 Added transaction to queue: ${newTx.id}`);
    return newTx.id;
  }

  // Get pending transactions that need processing
  public getPendingTransactions(): PendingTransaction[] {
    const transactions = this.readQueue();
    const now = Date.now();
    
    return transactions.filter(tx => {
      // Skip completed transactions
      if (tx.status === 'completed') return false;
      
      // Skip failed transactions that exceeded max retries
      if (tx.status === 'failed' && tx.retryCount >= this.maxRetries) return false;
      
      // Skip transactions currently being processed (within last 5 minutes)
      if (tx.status === 'processing' && (now - tx.lastAttempt) < 5 * 60 * 1000) return false;
      
      // Include transactions ready for retry (exponential backoff)
      if (tx.retryCount > 0) {
        const retryDelay = this.retryDelay * Math.pow(2, tx.retryCount - 1);
        return (now - tx.lastAttempt) >= retryDelay;
      }
      
      return true;
    });
  }

  // Update transaction status
  public updateTransaction(id: string, updates: Partial<PendingTransaction>): void {
    const transactions = this.readQueue();
    const index = transactions.findIndex(tx => tx.id === id);
    
    if (index === -1) {
      throw new Error(`Transaction not found: ${id}`);
    }
    
    transactions[index] = {
      ...transactions[index],
      ...updates,
      lastAttempt: Date.now()
    };
    
    this.writeQueue(transactions);
  }

  // Mark transaction as processing
  public markProcessing(id: string): void {
    this.updateTransaction(id, { 
      status: 'processing',
      retryCount: this.getTransaction(id)?.retryCount || 0 + 1
    });
  }

  // Mark transaction as completed
  public markCompleted(id: string, txHash: string): void {
    this.updateTransaction(id, { 
      status: 'completed',
      txHash 
    });
    console.log(`✅ Transaction completed: ${id} - ${txHash}`);
  }

  // Mark transaction as failed
  public markFailed(id: string, errorMessage: string): void {
    const tx = this.getTransaction(id);
    const shouldRetry = tx && tx.retryCount < this.maxRetries;
    
    this.updateTransaction(id, { 
      status: shouldRetry ? 'pending' : 'failed',
      errorMessage,
      retryCount: (tx?.retryCount || 0) + 1
    });
    
    if (shouldRetry) {
      console.warn(`⚠️  Transaction failed, will retry: ${id} (attempt ${tx?.retryCount + 1}/${this.maxRetries})`);
    } else {
      console.error(`❌ Transaction permanently failed: ${id} - ${errorMessage}`);
    }
  }

  // Get specific transaction
  public getTransaction(id: string): PendingTransaction | undefined {
    const transactions = this.readQueue();
    return transactions.find(tx => tx.id === id);
  }

  // Get all transactions (for monitoring)
  public getAllTransactions(): PendingTransaction[] {
    return this.readQueue();
  }

  // Clean up old completed transactions (older than 24 hours)
  public cleanup(): void {
    const transactions = this.readQueue();
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    
    const filtered = transactions.filter(tx => {
      if (tx.status === 'completed' && tx.timestamp < cutoff) {
        return false;
      }
      return true;
    });
    
    if (filtered.length !== transactions.length) {
      this.writeQueue(filtered);
      console.log(`🧹 Cleaned up ${transactions.length - filtered.length} old transactions`);
    }
  }
}

export const transactionQueue = new TransactionQueue();
