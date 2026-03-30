import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (!apiUrl) {
      return NextResponse.json({ error: 'API not configured' }, { status: 500 })
    }

    const body = await req.json()
    const { documentId } = body

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 })
    }

    // Call the tRPC endpoint
    const response = await fetch(`${apiUrl}/trpc/document.delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        json: { documentId },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(error, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data.result.data)
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
