import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from packages/db/.env before tests run
config({ path: resolve(__dirname, '../../../.env'), override: false })

// Ensure required env vars are set for tests
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Check packages/db/.env')
}
