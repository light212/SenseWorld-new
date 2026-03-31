# Component Contract: CameraCapture

## 位置

`components/camera-capture.tsx`

## 接口

```typescript
import { forwardRef, useImperativeHandle } from 'react'

export interface CameraCaptureRef {
  /** 
   * 截取当前摄像头帧
   * @returns 纯 base64 JPEG 字符串（不含 data URI 前缀），摄像头未开启或失败时返回 null
   */
  captureFrame(): string | null
}

export interface CameraCaptureProps {
  /** 摄像头错误回调（权限被拒、设备不可用等） */
  onError?: (message: string) => void
}

// 使用方式
const cameraRef = useRef<CameraCaptureRef>(null)
<CameraCapture ref={cameraRef} onError={(msg) => setError(msg)} />

// 发送消息时截帧
const imageBase64 = cameraRef.current?.captureFrame() ?? null
```

## 行为规范

| 场景 | 行为 |
|------|------|
| 初始状态 | 摄像头关闭，显示「开启摄像头」按钮 |
| 点击开启 | 调用 `getUserMedia`，成功后显示实时预览 |
| 权限被拒 | 调用 `onError`，按钮重置为关闭状态 |
| `captureFrame()` | 同步截取当前视频帧，canvas 长边 ≤ 512px，JPEG quality=0.8 |
| base64 > 200KB | 以 quality=0.6 重试一次；仍超出调用 `onError` 并返回 null |
| 点击关闭 | 停止所有 MediaStreamTrack，隐藏预览 |
| 组件卸载 | 自动停止所有 MediaStreamTrack（cleanup） |
| 摄像头关闭时 `captureFrame()` | 返回 null |

## 尺寸压缩算法

```
原始尺寸: W × H
目标长边: MAX = 512
如果 max(W, H) > MAX:
  scale = MAX / max(W, H)
  canvas.width  = Math.round(W * scale)
  canvas.height = Math.round(H * scale)
否则:
  canvas.width  = W
  canvas.height = H
```
