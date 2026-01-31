const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const DEFAULT_TIMEOUT = 30000;

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  timeout: number = DEFAULT_TIMEOUT
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText || 'Request failed',
      }));
      throw new Error(error.detail || error.message || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      throw error;
    }
    throw new Error('An unexpected error occurred');
  }
}

// API methods (stubs - will connect to real backend)
export const api = {
  // Health check
  async health(): Promise<{ status: string }> {
    return fetchApi('/health');
  },

  // Generate code snippets
  async generateSnippets(params: {
    language: string;
    difficulty: string;
    complexityLevel: string;
    count: number;
  }) {
    return fetchApi('/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Audit tasks with Hacktron
  async auditTasks(params: {
    tasks: unknown[];
    language: string;
  }) {
    return fetchApi('/audit', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Generate TTS audio
  async generateSpeech(params: {
    text: string;
    voiceId?: string;
  }) {
    return fetchApi('/tts', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};

export default api;
