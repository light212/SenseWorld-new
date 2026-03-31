'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

export interface CameraCaptureRef {
  captureFrame(): string | null
}

export interface CameraCaptureProps {
  onError?: (message: string) => void
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
  { onError },
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isActive, setIsActive] = useState(false)

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

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setIsActive(true)
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
      setIsActive(false)
    }
  }

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setIsActive(false)
  }

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()) }, [])

  return (
    <div className="flex flex-col items-center gap-2">
      {isActive && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-48 h-36 rounded object-cover bg-black"
        />
      )}
      <button
        type="button"
        onClick={isActive ? stop : start}
        className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100"
      >
        {isActive ? '关闭摄像头' : '开启摄像头'}
      </button>
    </div>
  )
})

export default CameraCapture
