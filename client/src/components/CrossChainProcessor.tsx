"use client";

import React, { useState } from 'react';
import { relayerClient, type ProcessingResult } from '../utils/relayer-client';

interface CrossChainProcessorProps {
  onProcessingComplete?: (result: ProcessingResult) => void;
}

export function CrossChainProcessor({ onProcessingComplete }: CrossChainProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcessTransactions = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await relayerClient.processTransactions(60000); // 1 minute timeout
      
      if (response.success && response.result) {
        setLastResult(response.result);
        onProcessingComplete?.(response.result);
      } else {
        setError(response.error || 'Processing failed');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoProcess = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      const success = await relayerClient.processOnUserAction(3, 5000);
      
      if (success) {
        // Get the latest result
        const response = await relayerClient.processTransactions(5000); // Quick check
        if (response.success && response.result) {
          setLastResult(response.result);
          onProcessingComplete?.(response.result);
        }
      } else {
        setLastResult({
          success: false,
          messagesProcessed: 0,
          errors: [],
          chains: []
        });
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Cross-Chain Message Processor
        </h3>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          isProcessing 
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        }`}>
          {isProcessing ? 'Processing...' : 'Ready'}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleProcessTransactions}
            disabled={isProcessing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              '🔄 Process Now'
            )}
          </button>

          <button
            onClick={handleAutoProcess}
            disabled={isProcessing}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Auto Processing...
              </>
            ) : (
              '🤖 Auto Process'
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center">
              <span className="text-red-600 dark:text-red-400 text-sm">
                ❌ {error}
              </span>
            </div>
          </div>
        )}

        {lastResult && (
          <div className={`border rounded-lg p-4 ${
            lastResult.success 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'
          }`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">
                  {lastResult.success ? '✅ Processing Complete' : '📭 No Messages Found'}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {lastResult.messagesProcessed} messages processed
                </span>
              </div>
              
              {lastResult.chains.length > 0 && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Chains: {lastResult.chains.join(', ')}
                </div>
              )}
              
              {lastResult.errors.length > 0 && (
                <div className="text-xs text-red-600 dark:text-red-400">
                  Errors: {lastResult.errors.length}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded p-3">
          <p className="mb-1">
            <strong>Process Now:</strong> Immediately checks all chains for pending messages (1 min timeout)
          </p>
          <p>
            <strong>Auto Process:</strong> Automatically retries if no messages found (3 attempts, 5s intervals)
          </p>
        </div>
      </div>
    </div>
  );
}

// Hook for easy integration with deposit/withdraw flows
export function useCrossChainProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processAfterTransaction = async (txHash?: string) => {
    setIsProcessing(true);
    
    try {
      console.log(`🔄 Processing cross-chain messages after transaction: ${txHash}`);
      
      // Wait a bit for the transaction to be indexed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const success = await relayerClient.processOnUserAction(3, 5000);
      
      if (success) {
        console.log('✅ Cross-chain processing completed successfully!');
        return true;
      } else {
        console.log('📭 No cross-chain messages found');
        return false;
      }
    } catch (error) {
      console.error('❌ Cross-chain processing failed:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    processAfterTransaction,
  };
}
