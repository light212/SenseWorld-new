import type { AvatarProvider } from './types'

/**
 * AvatarFactory - 根据运营配置创建对应的 AvatarProvider 实例（预留，Feature 008 实现）
 *
 * 新增数字人服务商后，在 switch 中添加对应 case 即可，业务逻辑无需修改。
 */
export class AvatarFactory {
  /**
   * 根据服务商名称创建 AvatarProvider 实例
   * @param provider 服务商名称（与运营配置中 avatar_provider 字段对应）
   * @param apiKey API 密钥
   * @returns AvatarProvider 实例
   * @throws 不支持的服务商时抛出错误
   */
  static create(provider: string, apiKey: string): AvatarProvider {
    switch (provider) {
      // Feature 008-avatar 阶段实现以下 case
      // case 'heygen':
      //   return new HeyGenProvider(apiKey)
      // case 'did':
      //   return new DIDProvider(apiKey)
      default:
        throw new Error(`Unsupported avatar provider: ${provider}`)
    }
  }
}
