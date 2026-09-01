import { useEffect, useRef, useState } from 'react';
import type {
  AppError,
  AskResult,
  PopupMessage,
  ProviderId,
  SettingsStatus,
  WorkerResponse,
} from '../shared/types';

type View = 'ask' | 'settings';
type RequestState = 'idle' | 'loading';

const errorMessages: Record<AppError['code'], string> = {
  MISSING_API_KEY: 'Add an API key before asking a question.',
  INVALID_API_KEY: 'The AI provider rejected this API key.',
  RATE_LIMITED: 'The provider rate limit was reached. Try again shortly.',
  NETWORK_ERROR: 'Unable to reach the AI provider. Check your connection and try again.',
  PROVIDER_ERROR: 'The AI provider is temporarily unavailable. Try again shortly.',
  INVALID_REQUEST: 'Enter a question before asking.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
};

export default function App() {
  const [settings, setSettings] = useState<SettingsStatus | null>(null);
  const [view, setView] = useState<View>('settings');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [requestState, setRequestState] = useState<RequestState>('idle');
  const [error, setError] = useState<AppError | null>(null);
  const questionInput = useRef<HTMLTextAreaElement>(null);
  const keyInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadSettings();
  }, []);

  useEffect(() => {
    if (!settings) {
      return;
    }

    if (view === 'ask' && settings.apiKeyConfigured) {
      questionInput.current?.focus();
    } else if (view === 'settings') {
      keyInput.current?.focus();
    }
  }, [settings, view]);

  async function loadSettings() {
    const result = await sendMessage<SettingsStatus>({ type: 'GET_SETTINGS_STATUS' });
    if (result.ok) {
      setSettings(result.data);
      setView(result.data.apiKeyConfigured ? 'ask' : 'settings');
    } else {
      setError(result.error);
    }
  }

  async function saveKey(provider: ProviderId, apiKey: string) {
    setError(null);
    const result = await sendMessage<SettingsStatus>({ type: 'SAVE_API_KEY', payload: { apiKey, provider } });
    if (result.ok) {
      setSettings(result.data);
      setView('ask');
      return true;
    }

    setError(result.error);
    return false;
  }

  async function selectProvider(provider: ProviderId) {
    setError(null);
    const result = await sendMessage<SettingsStatus>({ type: 'SET_PROVIDER', payload: { provider } });
    if (result.ok) {
      setSettings(result.data);
    } else {
      setError(result.error);
    }
  }

  async function removeKey() {
    setError(null);
    const result = await sendMessage<SettingsStatus>({ type: 'REMOVE_API_KEY' });
    if (result.ok) {
      setSettings(result.data);
      setResponse('');
      setView('settings');
    } else {
      setError(result.error);
    }
  }

  async function submitQuestion() {
    if (!prompt.trim() || requestState === 'loading') {
      return;
    }

    setRequestState('loading');
    setError(null);
    const result = await sendMessage<AskResult>({ type: 'ASK_AI', payload: { prompt } });
    setRequestState('idle');

    if (result.ok) {
      setResponse(result.data.content);
      return;
    }

    setError(result.error);
    if (result.error.code === 'MISSING_API_KEY' || result.error.code === 'INVALID_API_KEY') {
      setView('settings');
    }
  }

  if (!settings) {
    return <main className="popup-shell"><p className="status-message" role="status">Loading settings…</p></main>;
  }

  return (
    <main className="popup-shell">
      {view === 'settings' ? (
        <SettingsView
          configured={settings.apiKeyConfigured}
          error={error}
          inputRef={keyInput}
          provider={settings.provider}
          onBack={() => setView('ask')}
          onProviderChange={selectProvider}
          onRemove={removeKey}
          onSave={saveKey}
        />
      ) : (
        <AskView
          error={error}
          inputRef={questionInput}
          loading={requestState === 'loading'}
          prompt={prompt}
          response={response}
          onOpenSettings={() => {
            setError(null);
            setView('settings');
          }}
          onPromptChange={setPrompt}
          onSubmit={submitQuestion}
        />
      )}
    </main>
  );
}

interface AskViewProps {
  error: AppError | null;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  loading: boolean;
  prompt: string;
  response: string;
  onOpenSettings: () => void;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
}

function AskView({
  error, inputRef, loading, prompt, response, onOpenSettings, onPromptChange, onSubmit,
}: AskViewProps) {
  return (
    <>
      <header className="popup-header">
        <div>
          <h1>AI Assistant</h1>
          <p>Ask without leaving your current page</p>
        </div>
        <button className="text-button" type="button" onClick={onOpenSettings}>Settings</button>
      </header>
      <section className="composer" aria-labelledby="question-label">
        <label id="question-label" htmlFor="question">Question</label>
        <textarea
          ref={inputRef}
          id="question"
          value={prompt}
          placeholder="Ask anything..."
          onChange={(event) => onPromptChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
        <div className="composer-actions">
          <span className="shortcut">Cmd/Ctrl + Enter</span>
          <button className="primary-button" type="button" disabled={!prompt.trim() || loading} onClick={onSubmit}>
            {loading ? 'Asking…' : 'Ask'}
          </button>
        </div>
      </section>
      <StatusMessage error={error} loading={loading} />
      <section className="response-panel" aria-labelledby="response-title">
        <h2 id="response-title">Response</h2>
        <div className={response ? 'response-text' : 'response-empty'}>
          {response || 'Your answer will appear here.'}
        </div>
      </section>
    </>
  );
}

interface SettingsViewProps {
  configured: boolean;
  error: AppError | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  provider: ProviderId;
  onBack: () => void;
  onProviderChange: (provider: ProviderId) => Promise<void>;
  onRemove: () => void;
  onSave: (provider: ProviderId, apiKey: string) => Promise<boolean>;
}

function SettingsView({
  configured, error, inputRef, provider, onBack, onProviderChange, onRemove, onSave,
}: SettingsViewProps) {
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!apiKey.trim() || saving) {
      return;
    }

    setSaving(true);
    const saved = await onSave(provider, apiKey);
    setApiKey('');
    setSaving(false);
    if (!saved) {
      inputRef.current?.focus();
    }
  }

  return (
    <>
      <header className="popup-header">
        <div>
          <h1>Settings</h1>
          <p>Configure your AI provider API key</p>
        </div>
        {configured && <button className="text-button" type="button" onClick={onBack}>Back</button>}
      </header>
      <section className="settings-content" aria-labelledby="api-key-label">
        <p className="helper-text">Your key is stored in this Chrome extension profile and used only for provider requests.</p>
        {configured && <p className="configured-status" role="status">API key configured</p>}
        <label htmlFor="provider">AI provider</label>
        <select
          id="provider"
          value={provider}
          onChange={(event) => void onProviderChange(event.target.value as ProviderId)}
        >
          <option value="openai">OpenAI</option>
          <option value="gemini">Google Gemini</option>
        </select>
        <label id="api-key-label" htmlFor="api-key">
          {configured ? `Replace ${provider === 'gemini' ? 'Gemini' : 'OpenAI'} API key` : `${provider === 'gemini' ? 'Gemini' : 'OpenAI'} API key`}
        </label>
        <input
          ref={inputRef}
          id="api-key"
          type="password"
          value={apiKey}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          onChange={(event) => setApiKey(event.target.value)}
        />
        <div className="settings-actions">
          <button className="primary-button" type="button" disabled={!apiKey.trim() || saving} onClick={handleSave}>
            {saving ? 'Saving…' : configured ? 'Replace key' : 'Save key'}
          </button>
          {configured && <button className="danger-button" type="button" onClick={onRemove}>Remove</button>}
        </div>
        <StatusMessage error={error} loading={false} />
      </section>
    </>
  );
}

function StatusMessage({ error, loading }: { error: AppError | null; loading: boolean }) {
  if (loading) {
    return <p className="status-message" role="status">Waiting for the AI provider…</p>;
  }

  if (error) {
    return <p className="error-message" role="alert">{errorMessages[error.code]}</p>;
  }

  return null;
}

function sendMessage<T>(message: PopupMessage): Promise<WorkerResponse<T>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: WorkerResponse<T> | undefined) => {
      if (chrome.runtime.lastError || !response) {
        resolve({ ok: false, error: { code: 'UNKNOWN_ERROR' } });
        return;
      }

      resolve(response);
    });
  });
}
