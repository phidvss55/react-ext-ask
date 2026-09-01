import { askGemini, isGeminiProviderError } from '../providers/gemini';
import { askOpenAI, isProviderError } from '../providers/openai';
import type {
  AppError,
  AskResult,
  PopupMessage,
  ProviderId,
  SettingsStatus,
  WorkerResponse,
} from '../shared/types';

const PROVIDER_STORAGE_KEY = 'selectedProvider';
const DEFAULT_PROVIDER: ProviderId = 'openai';

class WorkerError extends Error {
  constructor(readonly appError: AppError) {
    super(appError.code);
  }
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  void handleMessage(message).then(sendResponse);
  return true;
});

async function handleMessage(message: unknown): Promise<WorkerResponse<AskResult | SettingsStatus>> {
  if (!isPopupMessage(message)) {
    return error('INVALID_REQUEST');
  }

  try {
    switch (message.type) {
      case 'GET_SETTINGS_STATUS':
        return success(await getSettingsStatus());
      case 'SAVE_API_KEY':
        return success(await saveApiKey(message.payload.provider, message.payload.apiKey));
      case 'SET_PROVIDER':
        return success(await setProvider(message.payload.provider));
      case 'REMOVE_API_KEY':
        return success(await removeApiKey());
      case 'ASK_AI':
        return success(await ask(message.payload.prompt));
    }
  } catch (caughtError) {
    if (isProviderError(caughtError) || isGeminiProviderError(caughtError)) {
      return { ok: false, error: caughtError.appError };
    }

    if (caughtError instanceof WorkerError) {
      return { ok: false, error: caughtError.appError };
    }

    return error('UNKNOWN_ERROR');
  }
}

async function getSettingsStatus(): Promise<SettingsStatus> {
  const stored = await chrome.storage.local.get(PROVIDER_STORAGE_KEY);
  const provider = isProviderId(stored[PROVIDER_STORAGE_KEY]) ? stored[PROVIDER_STORAGE_KEY] : DEFAULT_PROVIDER;
  return settingsStatus(provider, await hasApiKey(provider));
}

async function saveApiKey(provider: ProviderId, candidate: string): Promise<SettingsStatus> {
  const apiKey = candidate.trim();
  if (!apiKey) {
    throw new WorkerError({ code: 'INVALID_REQUEST' });
  }

  await chrome.storage.local.set({ [apiKeyStorageKey(provider)]: apiKey, [PROVIDER_STORAGE_KEY]: provider });
  return settingsStatus(provider, true);
}

async function setProvider(provider: ProviderId): Promise<SettingsStatus> {
  await chrome.storage.local.set({ [PROVIDER_STORAGE_KEY]: provider });
  return settingsStatus(provider, await hasApiKey(provider));
}

async function removeApiKey(): Promise<SettingsStatus> {
  const { provider } = await getSettingsStatus();
  await chrome.storage.local.remove(apiKeyStorageKey(provider));
  return settingsStatus(provider, false);
}

async function ask(prompt: string): Promise<AskResult> {
  if (!prompt.trim()) {
    throw new WorkerError({ code: 'INVALID_REQUEST' });
  }

  const { provider } = await getSettingsStatus();
  const stored = await chrome.storage.local.get(apiKeyStorageKey(provider));
  const apiKey = stored[apiKeyStorageKey(provider)];
  if (typeof apiKey !== 'string' || !apiKey) {
    throw new WorkerError({ code: 'MISSING_API_KEY' });
  }

  const input = { prompt: prompt.trim() };
  return provider === 'gemini' ? askGemini(apiKey, input) : askOpenAI(apiKey, input);
}

async function hasApiKey(provider: ProviderId): Promise<boolean> {
  const stored = await chrome.storage.local.get(apiKeyStorageKey(provider));
  const apiKey = stored[apiKeyStorageKey(provider)];
  return typeof apiKey === 'string' && apiKey.length > 0;
}

function apiKeyStorageKey(provider: ProviderId): string {
  return `${provider}ApiKey`;
}

function settingsStatus(provider: ProviderId, apiKeyConfigured: boolean): SettingsStatus {
  return { apiKeyConfigured, provider };
}

function success<T>(data: T): WorkerResponse<T> {
  return { ok: true, data };
}

function error(code: AppError['code']): WorkerResponse<never> {
  return { ok: false, error: { code } };
}

function isPopupMessage(value: unknown): value is PopupMessage {
  if (!value || typeof value !== 'object' || !('type' in value)) {
    return false;
  }

  const message = value as { type?: unknown; payload?: unknown };
  if (message.type === 'GET_SETTINGS_STATUS' || message.type === 'REMOVE_API_KEY') {
    return true;
  }

  if (message.type === 'ASK_AI') {
    return isStringField(message.payload, 'prompt');
  }

  if (message.type === 'SAVE_API_KEY') {
    return isApiKeyPayload(message.payload);
  }

  return message.type === 'SET_PROVIDER' && isProviderPayload(message.payload);
}

function isStringField(value: unknown, field: string): value is Record<string, string> {
  return Boolean(value && typeof value === 'object' && field in value && typeof value[field as keyof typeof value] === 'string');
}

function isProviderId(value: unknown): value is ProviderId {
  return value === 'openai' || value === 'gemini';
}

function isApiKeyPayload(value: unknown): value is { apiKey: string; provider: ProviderId } {
  return isStringField(value, 'apiKey') && isProviderPayload(value);
}

function isProviderPayload(value: unknown): value is { provider: ProviderId } {
  return Boolean(value && typeof value === 'object' && 'provider' in value && isProviderId(value.provider));
}
