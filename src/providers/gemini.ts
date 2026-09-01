import type { AppError, AskInput, AskResult } from '../shared/types';

const MODEL = 'gemini-3-flash';

class ProviderError extends Error {
  constructor(readonly appError: AppError) {
    super(appError.code);
  }
}

interface GenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

export async function askGemini(apiKey: string, input: AskInput): Promise<AskResult> {
  let response: Response;

  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: input.prompt }],
          }],
        }),
      },
    );
  } catch {
    throw new ProviderError({ code: 'NETWORK_ERROR' });
  }

  if (!response.ok) {
    throw new ProviderError({ code: errorCodeForStatus(response.status) });
  }

  let payload: GenerateContentResponse;
  try {
    payload = (await response.json()) as GenerateContentResponse;
  } catch {
    throw new ProviderError({ code: 'UNKNOWN_ERROR' });
  }

  const content = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim();

  if (!content) {
    throw new ProviderError({ code: 'UNKNOWN_ERROR' });
  }

  return { content };
}

export function isGeminiProviderError(error: unknown): error is ProviderError {
  return error instanceof ProviderError;
}

function errorCodeForStatus(status: number): AppError['code'] {
  if (status === 400) {
    return 'INVALID_REQUEST';
  }

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
