import type { AppError, AskInput, AskResult } from '../shared/types';

const CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

class ProviderError extends Error {
  constructor(readonly appError: AppError) {
    super(appError.code);
  }
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

export async function askOpenAI(apiKey: string, input: AskInput): Promise<AskResult> {
  let response: Response;

  try {
    response = await fetch(CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: input.prompt }],
      }),
    });
  } catch {
    throw new ProviderError({ code: 'NETWORK_ERROR' });
  }

  if (!response.ok) {
    throw new ProviderError({ code: errorCodeForStatus(response.status) });
  }

  let payload: ChatCompletionResponse;
  try {
    payload = (await response.json()) as ChatCompletionResponse;
  } catch {
    throw new ProviderError({ code: 'UNKNOWN_ERROR' });
  }

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new ProviderError({ code: 'UNKNOWN_ERROR' });
  }

  return { content };
}

export function isProviderError(error: unknown): error is ProviderError {
  return error instanceof ProviderError;
}

function errorCodeForStatus(status: number): AppError['code'] {
  if (status === 401 || status === 403) {
    return 'INVALID_API_KEY';
  }

  if (status === 429) {
    return 'RATE_LIMITED';
  }

  if (status >= 500 && status < 600) {
    return 'PROVIDER_ERROR';
  }

  return 'UNKNOWN_ERROR';
}
