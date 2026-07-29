import { NextRequest, NextResponse } from 'next/server'

const PINATA_JWT = process.env.PINATA_JWT
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  if (!PINATA_JWT) {
    console.error('POST /api/upload-thumbnail: PINATA_JWT is not set')
    return NextResponse.json(
      { error: 'Image upload is not configured on the server' },
      { status: 500 }
    )
  }

  try {
    const incomingFormData = await request.formData()
    const file = incomingFormData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })
    }

    const pinataFormData = new FormData()
    pinataFormData.append('file', file, file.name)

    const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`
      },
      body: pinataFormData
    })

    const pinataJson = await pinataRes.json()

    if (!pinataRes.ok) {
      console.error('Pinata upload failed:', pinataJson)
      return NextResponse.json(
        { error: pinataJson?.error?.details || pinataJson?.error || 'Upload to Pinata failed' },
        { status: 502 }
      )
    }

    const cid = pinataJson.IpfsHash
    const url = `https://gateway.pinata.cloud/ipfs/${cid}`

    // Sanity check: contract's thumbnailUri field caps at 256 bytes.
    // A Pinata gateway URL is ~80 chars, so this should never trip —
    // but flagging loudly if it ever does, rather than failing on-chain later.
    if (url.length > 256) {
      console.error('Generated thumbnail URL unexpectedly exceeds 256 chars:', url)
      return NextResponse.json({ error: 'Generated URL too long for contract' }, { status: 500 })
    }

    return NextResponse.json({ url, cid })
  } catch (err: any) {
    console.error('POST /api/upload-thumbnail failed:', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}