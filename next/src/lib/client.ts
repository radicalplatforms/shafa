import { hc } from 'hono/client'
import type { AppType } from '../../../hono/src/index'

export const client = hc<AppType>('http://localhost:8787/api')

