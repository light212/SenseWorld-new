import type { AvatarProvider } from './types'
import { HeyGenProvider } from './heygen-provider'
import { DIDProvider } from './did-provider'

export class AvatarFactory {
  static create(provider: string, apiKey: string, actorId: string): AvatarProvider {
    switch (provider) {
      case 'heygen':
        return new HeyGenProvider(apiKey, actorId)
      case 'did':
        return new DIDProvider(apiKey, actorId)
      default:
        throw new Error(`Unsupported avatar provider: ${provider}`)
    }
  }
}
