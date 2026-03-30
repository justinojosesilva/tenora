import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (!apiUrl) {
      return NextResponse.json({ error: 'API not configured' }, { status: 500 })
    }

    const propertyId = req.nextUrl.searchParams.get('propertyId')
    if (!propertyId) {
      return NextResponse.json({ error: 'Missing propertyId' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 })
    }

    // Call the tRPC endpoint
    const response = await fetch(`${apiUrl}/trpc/document.list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(error, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data.result.data)
  } catch (error) {
    console.error('Error listing documents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
