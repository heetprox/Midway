# Cross-Chain Transaction Queue System

## 🚀 Overview

This system replaces the always-running server with a robust API-based approach that handles failures gracefully through:

- **Transaction Queue**: All transactions are stored and tracked
- **Automatic Retries**: Failed transactions retry with exponential backoff
- **Background Processing**: Cron jobs ensure no transaction is left behind
- **Monitoring Dashboard**: Real-time visibility into transaction status

## 🏗️ Architecture

```
User Deposit/Withdraw → API Endpoint → Transaction Queue → Processing → Blockchain
                                    ↓
                                Queue Processor (Cron) ← Retry Logic
```

## 📚 Usage Examples

### 1. Process a Transaction (from your frontend)

```typescript
// When user deposits/withdraws
const response = await fetch('/api/layerZeroCall', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chainFrom: 'optimism',
    chainTo: 'eth', 
    userAddress: '0x123...',
    amount: '100',
    messageData: {
      chainId: 111n,
      addressCombination: '0xabc123...',
      payload: '0x'
    }
  })
});

const result = await response.json();

if (result.success) {
  // Transaction queued successfully
  const transactionId = result.transactionId;
  
  // Monitor status
  checkTransactionStatus(transactionId);
} else {
  console.error('Failed to queue transaction:', result.error);
}
```

### 2. Check Transaction Status

```typescript
async function checkTransactionStatus(transactionId: string) {
  const response = await fetch(`/api/layerZeroCall?id=${transactionId}`);
  const { transaction } = await response.json();
  
  console.log('Transaction status:', transaction.status);
  
  if (transaction.status === 'completed') {
    console.log('✅ Success! TX Hash:', transaction.txHash);
  } else if (transaction.status === 'failed') {
    console.log('❌ Failed:', transaction.errorMessage);
    console.log('Retries:', transaction.retryCount);
  }
}
```

### 3. Monitor Queue (Admin)

```typescript
// Get queue overview
const response = await fetch('/api/process-queue');
const { stats, samples } = await response.json();

console.log('Queue stats:', stats);
// { pending: 5, processing: 1, completed: 100, failed: 2 }

// Manual processing (if needed)
const processResponse = await fetch('/api/process-queue', { method: 'POST' });
const result = await processResponse.json();
console.log(`Processed ${result.processed} transactions`);
```

## 🔧 Setup Instructions

### 1. Environment Variables

Create `.env.local` with:

```env
# Bot wallet private key
BOT_PRIVATE_KEY=0x123...

# RPC URLs
OPTIMISM_SEPOLIA_RPC_URL=https://sepolia.optimism.io
ETH_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_key
# ... other RPC URLs

# Optional: Cron security
CRON_SECRET=your_random_string
NEXTAUTH_URL=https://your-app.vercel.app
```

### 2. Deploy with Automatic Processing

The `vercel.json` configures automatic queue processing every 2 minutes:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-queue", 
      "schedule": "*/2 * * * *"
    }
  ]
}
```

### 3. Add Monitoring to Your App

```tsx
import TransactionMonitor from '@/components/TransactionMonitor';

export default function AdminPage() {
  return (
    <div>
      <h1>Transaction Monitor</h1>
      <TransactionMonitor />
    </div>
  );
}
```

## 🛡️ Failure Handling

### What happens if API call breaks?

1. **Transaction Queued**: Even if processing fails, transaction is saved
2. **Automatic Retry**: System retries with exponential backoff (2s, 4s, 8s, 16s, 32s)
3. **Cron Backup**: Every 2 minutes, cron job processes any stuck transactions
4. **Manual Recovery**: Admin can manually trigger processing via dashboard

### Failure Scenarios Covered:

- ✅ Network timeouts
- ✅ RPC node failures  
- ✅ Gas estimation errors
- ✅ Nonce conflicts
- ✅ Server crashes
- ✅ Database connectivity issues

## 📊 Monitoring & Alerts

### Queue Status Endpoints:

- `GET /api/layerZeroCall` - Overall queue stats
- `GET /api/layerZeroCall?id=tx_123` - Specific transaction
- `GET /api/process-queue` - Detailed queue analysis

### Manual Controls:

- `POST /api/process-queue` - Process pending transactions
- `POST /api/cron/process-queue` - Trigger cron job manually

## 🔄 Migration from Always-Running Server

### Old Way:
```bash
# Server runs forever
bun server.ts
```

### New Way:
```bash
# Deploy Next.js app with cron
vercel deploy

# Automatic processing every 2 minutes
# Manual processing via API calls
# Real-time monitoring dashboard
```

## 🚨 Important Notes

1. **Database**: Currently uses JSON file storage. For production, upgrade to PostgreSQL/MongoDB
2. **Concurrency**: Queue processor handles one transaction at a time to prevent conflicts
3. **Security**: Add authentication to admin endpoints in production
4. **Monitoring**: Set up alerts for stuck transactions (>10 minutes old)

## 🐛 Troubleshooting

### High Retry Count
- Check RPC node status
- Verify private key has funds
- Check network connectivity

### Stuck Processing
- Manual trigger: `POST /api/process-queue`  
- Check server logs for errors
- Verify environment variables

### Queue Growing
- Increase cron frequency
- Add more processing workers
- Check for systematic failures
