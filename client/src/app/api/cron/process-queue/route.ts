// Cron job endpoint for automatic queue processing
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron call (you can add auth headers here)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log("⏰ Cron job triggered: processing transaction queue");
    
    // Call the queue processor
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/process-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`Queue processing failed: ${result.error}`);
    }
    
    console.log("✅ Cron job completed successfully:", result);
    
    return NextResponse.json({
      success: true,
      message: 'Cron job completed',
      timestamp: new Date().toISOString(),
      result
    });
    
  } catch (error) {
    console.error('❌ Cron job failed:', error);
    return NextResponse.json(
      { 
        error: 'Cron job failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
