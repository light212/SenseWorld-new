import type { AvatarProvider } from './types'

export class HeyGenProvider implements AvatarProvider {
  private apiKey: string
  private avatarId: string

  constructor(apiKey: string, avatarId: string) {
    this.apiKey = apiKey
    this.avatarId = avatarId
  }

  async submitVideo(text: string): Promise<string> {
    const res = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: { type: 'avatar', avatar_id: this.avatarId },
            voice: { type: 'text', input_text: text },
          },
        ],
        dimension: { width: 1280, height: 720 },
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      throw new Error(`avatar provider error: HeyGen submit failed ${res.status}`)
    }
    const data = await res.json()
    const videoId = data?.data?.video_id
    if (!videoId) {
      throw new Error('avatar provider error: HeyGen returned no video_id')
    }
    return videoId
  }

  async getVideoStatus(jobId: string): Promise<{
    status: 'pending' | 'processing' | 'done' | 'failed'
    videoUrl?: string
  }> {
    const res = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(jobId)}`,
      {
        headers: { 'X-Api-Key': this.apiKey },
        signal: AbortSignal.timeout(10000),
      }
    )
    if (!res.ok) {
      throw new Error(`avatar provider error: HeyGen status failed ${res.status}`)
    }
    const data = await res.json()
    const s = data?.data?.status as string | undefined
    let status: 'pending' | 'processing' | 'done' | 'failed'
    if (s === 'completed') {
      status = 'done'
    } else if (s === 'failed') {
      status = 'failed'
    } else if (s === 'processing') {
      status = 'processing'
    } else {
      status = 'pending'
    }
    return {
      status,
      videoUrl: status === 'done' ? data?.data?.video_url : undefined,
    }
  }
}
