// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Generic fetch wrapper with error handling
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
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
