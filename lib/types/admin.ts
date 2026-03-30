export interface AdminApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface ConfigItem {
  key: string;
  value: string;
  description?: string | null;
  updatedAt: string;
}

export interface AccessTokenItem {
  id: number;
  token: string;
  label: string | null;
  expiresAt: string | null;
  enabled: boolean;
  createdAt: string;
}
