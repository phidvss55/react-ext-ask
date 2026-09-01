export type AppErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_API_KEY'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'PROVIDER_ERROR'
  | 'INVALID_REQUEST'
  | 'UNKNOWN_ERROR';

export interface AppError {
  code: AppErrorCode;
}

export interface AskInput {
  prompt: string;
}

export interface AskResult {
  content: string;
}

export type ProviderId = 'openai' | 'gemini';

export interface SettingsStatus {
  apiKeyConfigured: boolean;
  provider: ProviderId;
}

export type PopupMessage =
  | { type: 'ASK_AI'; payload: AskInput }
  | { type: 'SAVE_API_KEY'; payload: { apiKey: string; provider: ProviderId } }
  | { type: 'SET_PROVIDER'; payload: { provider: ProviderId } }
  | { type: 'REMOVE_API_KEY' }
  | { type: 'GET_SETTINGS_STATUS' };

export type WorkerResponse<T> = { ok: true; data: T } | { ok: false; error: AppError };
