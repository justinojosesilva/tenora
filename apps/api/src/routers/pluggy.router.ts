import { router, protectedProcedure } from '@tenora/trpc'
import { TRPCError } from '@trpc/server'
import { getPluggyClient } from '../lib/pluggy-client.js'

export const pluggyRouter = router({
  /**
   * Get API key to verify Pluggy authentication is working
   */
  getApiKey: protectedProcedure.query(async ({ ctx }) => {
    try {
      const redis = ctx.redis
      const pluggy = getPluggyClient(redis)
      await pluggy.getApiKey()
      return { authenticated: true }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to authenticate with Pluggy',
      })
    }
  }),

  /**
   * Create a connect token for the Pluggy widget
   * Token is automatically cached in Redis for 30 minutes
   */
  createConnectToken: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const redis = ctx.redis
      const pluggy = getPluggyClient(redis)
      const token = await pluggy.createConnectToken()
      return { token }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create Pluggy connect token',
      })
    }
  }),
})
