import 'server-only'

// ---------------------------------------------------------------------------
// Typed server configuration (REQ: no magic numbers, typed config).
// ---------------------------------------------------------------------------

export interface IndexerConfig {
  chainId: string
  contractAddress: string
  rpcUrl: string
  startBlock: number
  batchSize: number
  confirmationDepth: number
  maxRetries: number
  backoffBaseMs: number
  backoffMaxMs: number
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function getIndexerConfig(): IndexerConfig {
  const contractAddress = process.env.CONTRACT_ADDRESS?.trim()
  if (!contractAddress) {
    throw new Error('CONTRACT_ADDRESS is required for the indexer.')
  }

  return {
    chainId: process.env.INTERLINK_CHAIN_ID?.trim() || '19042026',
    contractAddress,
    rpcUrl:
      process.env.INTERLINK_RPC_URL?.trim() ||
      'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc',
    startBlock: envInt('INDEXER_START_BLOCK', 0),
    batchSize: envInt('INDEXER_BATCH_SIZE', 500),
    confirmationDepth: envInt('INDEXER_CONFIRMATION_DEPTH', 3),
    maxRetries: envInt('INDEXER_MAX_RETRIES', 5),
    backoffBaseMs: envInt('INDEXER_BACKOFF_BASE_MS', 500),
    backoffMaxMs: envInt('INDEXER_BACKOFF_MAX_MS', 30_000),
  }
}