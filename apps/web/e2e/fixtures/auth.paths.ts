import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const AUTH_FILE_A = path.join(__dirname, '../../.auth/userA.json')
export const AUTH_FILE_B = path.join(__dirname, '../../.auth/userB.json')
