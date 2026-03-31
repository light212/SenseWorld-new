'use client'

import { useEffect, useRef, useState } from 'react'

interface AvatarPlayerProps {
  videoUrl: string | null
  loading: boolean
  error: string | null
}

export default function AvatarPlayer({ videoUrl, loading, error }: AvatarPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    if (videoUrl && videoRef.current) {
      videoRef.current.src = videoUrl
      videoRef.current.play().catch(() => {
        // autoplay blocked — user interaction required
      })
    }
  }, [videoUrl])

  if (!loading && !videoUrl && !error) return null

  return (
    <div className="w-full flex flex-col items-center gap-2 py-3">
      {loading && !videoUrl && (
        <div className="w-64 h-36 rounded-xl bg-gray-100 flex items-center justify-center text-sm text-gray-400">
          数字人生成中...
        </div>
      )}
      {videoUrl && (
        <div className="flex flex-col items-center gap-1">
          <video
            ref={videoRef}
            className="w-64 h-36 rounded-xl object-cover bg-black"
            autoPlay
            muted={muted}
            playsInline
            onEnded={() => {
              if (videoRef.current) {
                videoRef.current.pause()
              }
            }}
          />
          {muted && (
            <button
              className="text-xs text-gray-500 underline"
              onClick={() => {
                setMuted(false)
                if (videoRef.current) videoRef.current.muted = false
              }}
            >
              取消静音
            </button>
          )}
        </div>
      )}
      {error && (
        <div className="text-xs text-gray-400">{error}</div>
      )}
    </div>
  )
}
