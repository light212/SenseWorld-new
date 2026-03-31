export interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  streaming?: boolean
}

export interface CapabilityFlags {
  supportsSTT: boolean
  supportsTTS: boolean
  supportsVision: boolean
}

export type RecordingState = 'idle' | 'recording' | 'processing'
