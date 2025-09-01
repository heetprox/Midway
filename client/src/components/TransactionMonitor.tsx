'use client';

import { useState, useEffect } from 'react';

interface Transaction {
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
}

interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retryable: number;
}

export default function TransactionMonitor() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchQueueStatus = async () => {
    try {
      const response = await fetch('/api/process-queue');
      const data = await response.json();
      
      setStats(data.stats);
      setTransactions([
        ...data.samples.currentlyPending,
        ...data.samples.recentCompleted,
        ...data.samples.recentlyFailed
      ].slice(0, 20));
      
    } catch (error) {
      console.error('Failed to fetch queue status:', error);
    } finally {
      setLoading(false);
    }
  };

  const processQueue = async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/process-queue', {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Processed ${result.processed} transactions. ${result.failed} failed.`);
        fetchQueueStatus(); // Refresh data
      } else {
        alert(`❌ Failed to process queue: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchQueueStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchQueueStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatTimeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Transaction Queue Status</h2>
          <button
            onClick={fetchQueueStatus}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Refresh
          </button>
        </div>
        
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
              <div className="text-sm text-gray-500">Processing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-gray-500">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.retryable}</div>
              <div className="text-sm text-gray-500">Retryable</div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Processing */}
      {stats && stats.retryable > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-orange-800">
                {stats.retryable} transactions need processing
              </h3>
              <p className="text-sm text-orange-600">
                These transactions are queued for retry. You can process them manually or wait for the automatic processor.
              </p>
            </div>
            <button
              onClick={processQueue}
              disabled={processing}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white rounded transition-colors"
            >
              {processing ? 'Processing...' : 'Process Now'}
            </button>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Retries
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {tx.id.slice(0, 20)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tx.chainFrom} → {tx.chainTo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tx.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(tx.status)}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{formatTimeAgo(tx.timestamp)}</div>
                    {tx.txHash && (
                      <div className="text-xs text-blue-600 font-mono">
                        {tx.txHash.slice(0, 10)}...
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tx.retryCount > 0 && (
                      <span className="text-orange-600">{tx.retryCount}/5</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {transactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No transactions found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
