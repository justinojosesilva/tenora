import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subscriptionId } = await req.json()

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 })
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const stripe = new Stripe(stripeKey)
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    if (!subscription.trial_end) {
      return NextResponse.json({ daysLeft: null })
    }

    const now = Math.floor(Date.now() / 1000)
    const daysLeft = Math.ceil((subscription.trial_end - now) / (60 * 60 * 24))

    return NextResponse.json({ daysLeft: Math.max(0, daysLeft) })
  } catch (error) {
    console.error('Failed to fetch subscription trial:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
