import { PluggyClient } from 'pluggy-sdk'
import type Redis from 'ioredis'

const CONNECT_TOKEN_CACHE_TTL = 30 * 60 // 30 minutes in seconds

export class PluggyClientWrapper {
  private client: PluggyClient | null = null
  private redis: Redis

  constructor(redis: Redis) {
    this.redis = redis
    this.initializeClient()
  }

  private initializeClient() {
    const clientId = process.env.PLUGGY_CLIENT_ID
    const clientSecret = process.env.PLUGGY_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error(
        'Pluggy configuration missing: PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET are required',
      )
    }

    this.client = new PluggyClient({
      clientId,
      clientSecret,
    })
  }

  /**
   * Authenticate with Pluggy using client credentials
   * The SDK handles authentication internally on first API call
   */
  async getApiKey(): Promise<string> {
    if (!this.client) {
      throw new Error('Pluggy client not initialized')
    }

    try {
      // PluggyClient automatically authenticates on first API call
      // Make any API call to verify authentication is working
      // We make a simple fetchConnectors call to verify connection
      const connectors = await this.client.fetchConnectors()

      if (!connectors || !connectors.results || connectors.results.length === 0) {
        throw new Error('Failed to fetch connectors from Pluggy')
      }

      return 'authenticated'
    } catch (error) {
      throw new Error(
        `Pluggy authentication failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Create a connect token for the Pluggy widget
   * Token is cached in Redis for 30 minutes
   */
  async createConnectToken(): Promise<string> {
    if (!this.client) {
      throw new Error('Pluggy client not initialized')
    }

    const cacheKey = 'pluggy:connect_token'

    try {
      // Check if token exists in cache
      const cachedToken = await this.redis.get(cacheKey)
      if (cachedToken) {
        return cachedToken
      }

      // Create new connect token
      const tokenResponse = await this.client.createConnectToken()

      if (!tokenResponse || !tokenResponse.accessToken) {
        throw new Error('Failed to create Pluggy connect token')
      }

      const token = tokenResponse.accessToken

      // Cache the token in Redis for 30 minutes
      await this.redis.setex(cacheKey, CONNECT_TOKEN_CACHE_TTL, token)

      return token
    } catch (error) {
      throw new Error(
        `Pluggy connect token creation failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Invalidate cached connect token
   */
  async invalidateConnectToken(): Promise<void> {
    const cacheKey = 'pluggy:connect_token'
    await this.redis.del(cacheKey)
  }

  /**
   * Fetch all transactions for a given account from Pluggy
   * @param accountId The account ID to fetch transactions for
   * @returns An array of transactions
   */
  async fetchAllTransactions(accountId: string): Promise<
    Array<{
      id: string
      date: Date
      description: string | null
      descriptionRaw: string | null
      amount: number
      type: 'DEBIT' | 'CREDIT'
    }>
  > {
    if (!this.client) {
      throw new Error('Pluggy client not initialized')
    }

    try {
      const transactions = await this.client.fetchAllTransactions(accountId)
      return transactions
    } catch (error) {
      throw new Error(
        `Pluggy transaction fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}

// Singleton instance
let pluggyClientInstance: PluggyClientWrapper | null = null

export function getPluggyClient(redis: Redis): PluggyClientWrapper {
  if (!pluggyClientInstance) {
    pluggyClientInstance = new PluggyClientWrapper(redis)
  }
  return pluggyClientInstance
}
