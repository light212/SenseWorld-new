import type { AvatarProvider } from './types'

export class DIDProvider implements AvatarProvider {
  private authHeader: string
  private sourceUrl: string

  constructor(apiKey: string, sourceUrl: string) {
    this.authHeader = `Basic ${Buffer.from(apiKey).toString('base64')}`
    this.sourceUrl = sourceUrl
  }

  async submitVideo(text: string): Promise<string> {
    const res = await fetch('https://api.d-id.com/talks', {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_url: this.sourceUrl,
        script: { type: 'text', input: text },
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      throw new Error(`avatar provider error: D-ID submit failed ${res.status}`)
    }
    const data = await res.json()
    const id = data?.id
    if (!id) {
      throw new Error('avatar provider error: D-ID returned no id')
    }
    return id
  }

  async getVideoStatus(jobId: string): Promise<{
    status: 'pending' | 'processing' | 'done' | 'failed'
    videoUrl?: string
  }> {
    const res = await fetch(
      `https://api.d-id.com/talks/${encodeURIComponent(jobId)}`,
      {
        headers: { Authorization: this.authHeader },
        signal: AbortSignal.timeout(10000),
      }
    )
    if (!res.ok) {
      throw new Error(`avatar provider error: D-ID status failed ${res.status}`)
    }
    const data = await res.json()
    const s = data?.status as string | undefined
    let status: 'pending' | 'processing' | 'done' | 'failed'
    if (s === 'done') {
      status = 'done'
    } else if (s === 'error') {
      status = 'failed'
    } else if (s === 'created' || s === 'started') {
      status = 'processing'
    } else {
      status = 'pending'
    }
    return {
      status,
      videoUrl: status === 'done' ? data?.result_url : undefined,
    }
  }
}
