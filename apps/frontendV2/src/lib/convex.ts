import { ConvexReactClient } from 'convex/react'
import { runtimeEnv } from './env'

let convexClient: ConvexReactClient | null = null

export function getConvexClient() {
  if (!runtimeEnv.convexUrl) {
    return null
  }

  if (!convexClient) {
    convexClient = new ConvexReactClient(runtimeEnv.convexUrl)
  }

  return convexClient
}
