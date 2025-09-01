// Background queue processor API endpoint
import { NextRequest, NextResponse } from 'next/server';
import { transactionQueue } from '@/lib/transaction-queue';
import { processTransaction } from '@/lib/relayer-client';

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Starting queue processing...");
    
    // Clean up old transactions first
    transactionQueue.cleanup();
    
    // Get pending transactions
    const pendingTransactions = transactionQueue.getPendingTransactions();
    
    if (pendingTransactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending transactions to process',
        processed: 0
      });
    }
    
    console.log(`📥 Found ${pendingTransactions.length} pending transactions`);
    
    let processed = 0;
    let failed = 0;
    const results = [];
    
    // Process transactions sequentially to avoid overwhelming the system
    for (const tx of pendingTransactions) {
      try {
        console.log(`🔄 Processing queued transaction: ${tx.id}`);
        
        // Mark as processing
        transactionQueue.markProcessing(tx.id);
        
        // Process the transaction
        const txHash = await processTransaction(tx);
        
        // Mark as completed
        transactionQueue.markCompleted(tx.id, txHash);
        
        processed++;
        results.push({
          id: tx.id,
          status: 'completed',
          txHash
        });
        
        console.log(`✅ Successfully processed: ${tx.id}`);
        
      } catch (error: any) {
        const errorMessage = error.message || error.toString();
        
        // Mark as failed (will retry if under max retries)
        transactionQueue.markFailed(tx.id, errorMessage);
        
        failed++;
        results.push({
          id: tx.id,
          status: 'failed',
          error: errorMessage,
          retryCount: tx.retryCount + 1
        });
        
        console.error(`❌ Failed to process ${tx.id}:`, errorMessage);
      }
      
      // Small delay between transactions to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`🎉 Queue processing complete. Processed: ${processed}, Failed: ${failed}`);
    
    return NextResponse.json({
      success: true,
      message: `Queue processing complete`,
      processed,
      failed,
      total: pendingTransactions.length,
      results
    });
    
  } catch (error) {
    console.error('❌ Queue processing error:', error);
    return NextResponse.json(
      { error: 'Queue processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint for queue status
export async function GET() {
  try {
    const pending = transactionQueue.getPendingTransactions();
    const all = transactionQueue.getAllTransactions();
    
    // Calculate some useful stats
    const stats = {
      total: all.length,
      pending: all.filter(tx => tx.status === 'pending').length,
      processing: all.filter(tx => tx.status === 'processing').length,
      completed: all.filter(tx => tx.status === 'completed').length,
      failed: all.filter(tx => tx.status === 'failed').length,
      retryable: pending.length,
      oldestPending: pending.length > 0 ? Math.min(...pending.map(tx => tx.timestamp)) : null,
      newestPending: pending.length > 0 ? Math.max(...pending.map(tx => tx.timestamp)) : null
    };
    
    // Get some sample transactions for debugging
    const samples = {
      recentCompleted: all
        .filter(tx => tx.status === 'completed')
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5),
      currentlyPending: pending.slice(0, 10),
      recentlyFailed: all
        .filter(tx => tx.status === 'failed')
        .sort((a, b) => b.lastAttempt - a.lastAttempt)
        .slice(0, 5)
    };
    
    return NextResponse.json({
      stats,
      samples,
      recommendations: {
        shouldProcessQueue: pending.length > 0,
        urgentCount: pending.filter(tx => 
          Date.now() - tx.timestamp > 10 * 60 * 1000 // older than 10 minutes
        ).length
      }
    });
    
  } catch (error) {
    console.error('❌ Queue status error:', error);
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    );
  }
}
