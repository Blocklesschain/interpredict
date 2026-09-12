import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Phase 13: API Tests
//
// Tests the API routes: validation, pagination, error envelope,
// authorization, and freshness metadata.
// ---------------------------------------------------------------------------

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
}
vi.mock('@/lib/supabase', () => ({
  getSupabase: () => mockSupabase,
}))

// Mock repositories
vi.mock('@/repositories/markets', () => ({
  listMarkets: vi.fn(),
  getMarketById: vi.fn(),
  getSyncFreshness: vi.fn(),
}))

import { listMarkets, getSyncFreshness } from '@/repositories/markets'

describe('API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Markets API', () => {
    it('returns standard envelope with data, meta, error', async () => {
      const mockMarkets = [
        {
          id: 1,
          question: 'Test market?',
          description: '',
          category: 2,
          custom_category: null,
          origin: 0,
          creator: '0xabc',
          state: 5,
          end_time: 2000000000,
          resolution_criteria: 'Resolved by stats',
          thumbnail_url: null,
          total_volume: '1000000000000000000',
          participant_count: 5,
          confirmed_outcome: null,
          finalized: false,
          cancelled: false,
          cancel_reason: null,
          indexed_at: '2026-01-01T00:00:00Z',
          outcomes: [
            { market_id: 1, outcome_index: 0, label: 'Yes', pool: '500000000000000000', price: '500000000000000000' },
            { market_id: 1, outcome_index: 1, label: 'No', pool: '500000000000000000', price: '500000000000000000' },
          ],
        },
      ]

      vi.mocked(listMarkets).mockResolvedValue({
        markets: mockMarkets,
        total: 1,
        page: 1,
        pageSize: 20,
      })

      vi.mocked(getSyncFreshness).mockResolvedValue({
        lastSuccessfulSync: '2026-01-01T00:00:00Z',
        lagSeconds: 5,
      })

      // Import the route handler dynamically
      const { GET } = await import('@/app/api/markets/route')

      const request = new Request('http://localhost/api/markets?page=1&pageSize=20')
      const response = await GET(request as any)
      const body = await response.json()

      expect(body.data).toBeDefined()
      expect(body.data.markets).toHaveLength(1)
      expect(body.meta).toBeDefined()
      expect(body.meta.page).toBe(1)
      expect(body.meta.pageSize).toBe(20)
      expect(body.meta.total).toBe(1)
      expect(body.meta.freshness).toBeDefined()
      expect(body.error).toBeNull()
    })

    it('filters by state', async () => {
      vi.mocked(listMarkets).mockResolvedValue({
        markets: [],
        total: 0,
        page: 1,
        pageSize: 20,
      })
      vi.mocked(getSyncFreshness).mockResolvedValue({
        lastSuccessfulSync: '2026-01-01T00:00:00Z',
        lagSeconds: 5,
      })

      const { GET } = await import('@/app/api/markets/route')

      const request = new Request('http://localhost/api/markets?state=5')
      const response = await GET(request as any)
      const body = await response.json()

      expect(body.data.markets).toHaveLength(0)
      expect(listMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ state: 5 }),
      )
    })

    it('filters by category', async () => {
      vi.mocked(listMarkets).mockResolvedValue({
        markets: [],
        total: 0,
        page: 1,
        pageSize: 20,
      })
      vi.mocked(getSyncFreshness).mockResolvedValue({
        lastSuccessfulSync: '2026-01-01T00:00:00Z',
        lagSeconds: 5,
      })

      const { GET } = await import('@/app/api/markets/route')

      const request = new Request('http://localhost/api/markets?category=2')
      const response = await GET(request as any)
      const body = await response.json()

      expect(listMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ category: 2 }),
      )
    })

    it('validates pagination bounds', async () => {
      vi.mocked(listMarkets).mockResolvedValue({
        markets: [],
        total: 0,
        page: 1,
        pageSize: 20,
      })
      vi.mocked(getSyncFreshness).mockResolvedValue({
        lastSuccessfulSync: '2026-01-01T00:00:00Z',
        lagSeconds: 5,
      })

      const { GET } = await import('@/app/api/markets/route')

      // Negative page should default to 1
      const request = new Request('http://localhost/api/markets?page=-1&pageSize=200')
      const response = await GET(request as any)
      const body = await response.json()

      // page defaults to 1 when negative; pageSize passes through (capped in repository)
      expect(listMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 }),
      )
    })

    it('returns error envelope on failure', async () => {
      vi.mocked(listMarkets).mockRejectedValue(new Error('Database connection failed'))
      vi.mocked(getSyncFreshness).mockResolvedValue({
        lastSuccessfulSync: null,
        lagSeconds: null,
      })

      const { GET } = await import('@/app/api/markets/route')

      const request = new Request('http://localhost/api/markets')
      const response = await GET(request as any)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.data).toBeNull()
      expect(body.error).toBeDefined()
      expect(body.error.code).toBe('UNKNOWN')
    })
  })

  describe('Health API', () => {
    it('returns ok when database is reachable', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [{ chain_id: '19042026' }], error: null }),
      })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      vi.mocked(getSyncFreshness).mockResolvedValue({
        lastSuccessfulSync: '2026-01-01T00:00:00Z',
        lagSeconds: 5,
      })

      const { GET } = await import('@/app/api/health/route')

      const response = await GET()
      const body = await response.json()

      expect(body.data.status).toBe('ok')
      expect(body.data.database).toBe('reachable')
      expect(body.data.indexer.status).toBe('healthy')
      expect(body.error).toBeNull()
    })

    it('returns degraded when database is unreachable', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: null, error: new Error('Connection refused') }),
      })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      vi.mocked(getSyncFreshness).mockResolvedValue({
        lastSuccessfulSync: null,
        lagSeconds: null,
      })

      const { GET } = await import('@/app/api/health/route')

      const response = await GET()
      const body = await response.json()

      expect(body.data.status).toBe('degraded')
      expect(body.data.database).toBe('unreachable')
      expect(body.data.indexer.status).toBe('behind')
    })
  })
})