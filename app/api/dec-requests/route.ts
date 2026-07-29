import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@netlify/blobs'

interface DecRequest {
  address: string
  requestedAt: string
}

async function readPending(): Promise<DecRequest[]> {
  const store = getStore('dec-requests')
  const data = await store.get('pending', { type: 'json' })
  return (data as DecRequest[]) ?? []
}

async function writePending(list: DecRequest[]) {
  const store = getStore('dec-requests')
  await store.setJSON('pending', list)
}

export async function GET() {
  try {
    const pending = await readPending()
    return NextResponse.json({ pending })
  } catch (err: any) {
    console.error('GET /api/dec-requests failed:', err)
    return NextResponse.json({ error: err.message || 'Failed to load requests' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json()
    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }

    const pending = await readPending()
    const alreadyRequested = pending.some(r => r.address.toLowerCase() === address.toLowerCase())
    if (alreadyRequested) {
      return NextResponse.json({ ok: true, message: 'Request already submitted' })
    }

    pending.push({ address, requestedAt: new Date().toISOString() })
    await writePending(pending)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('POST /api/dec-requests failed:', err)
    return NextResponse.json({ error: err.message || 'Failed to submit request' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { address } = await request.json()
    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }

    const pending = await readPending()
    const filtered = pending.filter(r => r.address.toLowerCase() !== address.toLowerCase())
    await writePending(filtered)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('DELETE /api/dec-requests failed:', err)
    return NextResponse.json({ error: err.message || 'Failed to remove request' }, { status: 500 })
  }
}