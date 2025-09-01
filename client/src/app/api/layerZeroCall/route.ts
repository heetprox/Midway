import { NextRequest, NextResponse } from 'next/server';
import { transactionQueue } from '@/lib/transaction-queue';
import { processTransaction } from '@/lib/relayer-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    const { chainFrom, chainTo, userAddress, amount, messageData } = body;
    
    if (!chainFrom || !chainTo || !userAddress || !amount || !messageData) {
      return NextResponse.json(
        { error: 'Missing required fields: chainFrom, chainTo, userAddress, amount, messageData' },
        { status: 400 }
      );
    }

    // Add transaction to queue
    const transactionId = transactionQueue.addTransaction({
      chainFrom,
      chainTo,
      userAddress,
      amount,
      messageData
    });

    // Try to process immediately
    try {
      await processTransactionSafely(transactionId);
      
      return NextResponse.json({
        success: true,
        transactionId,
        message: 'Transaction processed successfully'
      });
    } catch (error) {
      // If immediate processing fails, it's now queued for retry
      console.warn(`⚠️  Immediate processing failed for ${transactionId}, queued for retry:`, error);
      
      return NextResponse.json({
        success: true,
        transactionId,
        message: 'Transaction queued for processing (will retry if failed)',
        warning: 'Initial processing attempt failed, but transaction is queued for automatic retry'
      }, { status: 202 }); // 202 Accepted
    }

  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for transaction status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('id');
    
    if (!transactionId) {
      // Return all pending transactions for monitoring
      const pending = transactionQueue.getPendingTransactions();
      const all = transactionQueue.getAllTransactions();
      
      return NextResponse.json({
        pendingCount: pending.length,
        totalCount: all.length,
        pending: pending.slice(0, 10), // Return first 10 for preview
        stats: {
          completed: all.filter(tx => tx.status === 'completed').length,
          failed: all.filter(tx => tx.status === 'failed').length,
          processing: all.filter(tx => tx.status === 'processing').length,
          pending: all.filter(tx => tx.status === 'pending').length
        }
      });
    }
    
    // Return specific transaction
    const transaction = transactionQueue.getTransaction(transactionId);
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ transaction });
    
  } catch (error) {
    console.error('❌ GET API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Safe transaction processing with error handling
async function processTransactionSafely(transactionId: string): Promise<void> {
  const transaction = transactionQueue.getTransaction(transactionId);
  
  if (!transaction) {
    throw new Error(`Transaction not found: ${transactionId}`);
  }
  
  try {
    // Mark as processing
    transactionQueue.markProcessing(transactionId);
    
    // Process the transaction
    const txHash = await processTransaction(transaction);
    
    // Mark as completed
    transactionQueue.markCompleted(transactionId, txHash);
    
  } catch (error: any) {
    // Mark as failed (will retry if under max retries)
    const errorMessage = error.message || error.toString();
    transactionQueue.markFailed(transactionId, errorMessage);
    
    throw error; // Re-throw for caller to handle
  }
}