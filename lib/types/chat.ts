export interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  streaming?: boolean
  imageUrl?: string
}

export interface CapabilityFlags {
  supportsSTT: boolean
  supportsTTS: boolean
  supportsVision: boolean
  supportsAvatar: boolean
}

export type RecordingState = 'idle' | 'recording' | 'processing'
