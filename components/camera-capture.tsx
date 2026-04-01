'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

export interface CameraCaptureRef {
  captureFrame(): string | null
}

export interface CameraCaptureProps {
  isActive: boolean
  onError?: (message: string) => void
  onClose?: () => void
}

const MAX_SIDE = 512
const MAX_BYTES = 200 * 1024

function resizeAndCapture(video: HTMLVideoElement, quality: number): string {
  const w = video.videoWidth
  const h = video.videoHeight
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

const CameraCapture = forwardRef<CameraCaptureRef, CameraCaptureProps>(function CameraCapture(
  { isActive, onError, onClose },
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isReady, setIsReady] = useState(false)

  useImperativeHandle(ref, () => ({
    captureFrame(): string | null {
      const video = videoRef.current
      if (!isActive || !video || !video.readyState || video.videoWidth === 0) return null

      const dataUrl = resizeAndCapture(video, 0.8)
      const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '')
      if (base64.length * 0.75 <= MAX_BYTES) return base64

      // Retry at lower quality
      const dataUrl2 = resizeAndCapture(video, 0.6)
      const base64_2 = dataUrl2.replace(/^data:image\/jpeg;base64,/, '')
      if (base64_2.length * 0.75 <= MAX_BYTES) return base64_2

      onError?.('截帧图片过大，无法附加到消息')
      return null
    },
  }))

  useEffect(() => {
    if (isActive) {
      const start = async () => {
        try {
          setIsReady(false)
          const stream = await navigator.mediaDevices.getUserMedia({ video: true })
          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.onloadedmetadata = () => setIsReady(true)
          }
        } catch (err) {
          if (err instanceof DOMException) {
            if (err.name === 'NotAllowedError') {
              onError?.('摄像头权限被拒绝，请在浏览器设置中允许访问')
            } else if (err.name === 'NotFoundError') {
              onError?.('未检测到摄像头设备')
            } else {
              onError?.('摄像头初始化失败')
            }
          } else {
            onError?.('摄像头初始化失败')
          }
          onClose?.()
        }
      }
      start()
    } else {
      setIsReady(false)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [isActive, onError, onClose])

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()) }, [])

  if (!isActive) return null

  return (
    <div className="relative flex justify-center mb-2 animate-in fade-in zoom-in-95 duration-200">
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-2xl backdrop-blur-md z-10 border border-white/10 shadow-xl w-48 h-36">
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/90 rounded-full animate-spin" />
            <span className="text-xs text-white/70 font-medium">开启摄像头...</span>
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-48 h-36 rounded-2xl object-cover bg-slate-900 shadow-xl border border-white/20 ring-1 ring-black/5 transition-opacity duration-300 ${isReady ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
})

export default CameraCapture
