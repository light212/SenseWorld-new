/**
 * AvatarProvider 接口 - 数字人视频服务商统一接口（预留，后期实现）
 *
 * 新增数字人服务商步骤：
 * 1. 在 lib/avatar/ 下新建 <provider-name>-avatar-provider.ts
 * 2. 实现此接口
 * 3. 在 lib/avatar/factory.ts 的 AvatarFactory.create() 中注册
 * 4. 运营后台配置面板即可选择新数字人服务商
 *
 * @remarks 此接口在 Feature 008-avatar 阶段实现，当前为预留骨架
 */
export interface AvatarProvider {
  /**
   * 生成数字人视频
   * @param text AI 回复文本（用于驱动数字人口型）
   * @param audioUrl 可选的音频 URL（若服务商支持直接使用音频驱动）
   * @returns 生成的视频 URL
   */
  generateVideo(text: string, audioUrl?: string): Promise<string>

  /**
   * 查询视频生成状态
   * @param jobId 任务 ID
   * @returns 当前生成状态
   */
  getStatus(jobId: string): Promise<'pending' | 'processing' | 'done' | 'failed'>
}
