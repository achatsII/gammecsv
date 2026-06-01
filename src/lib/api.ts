import { Fiche, Gamme, SystemPrompt, APP_ID } from '../types';
import { authStore } from '../utils/authStore';
import { checkAndProactiveRefresh, refreshAccessToken } from '../utils/authService';

const BASE_URL = 'https://qa.gateway.intelligenceindustrielle.com/api';

const decodeJWT = (token: string): any => {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch (e) {
        return null;
    }
};

const authenticatedFetch = async (url: string, options: RequestInit = {}, retryCount = 0): Promise<Response> => {
    await checkAndProactiveRefresh();

    const token = authStore.getAccess();
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token.trim()}`;
        
        const payload = decodeJWT(token);
        if (payload?.grant_id) {
            headers['Grant-ID'] = payload.grant_id;
        }
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 && retryCount === 0) {
        try {
            await refreshAccessToken();
            return authenticatedFetch(url, options, retryCount + 1);
        } catch (refreshErr) {
            authStore.clear();
            return response;
        }
    }

    if (response.status === 401 && retryCount >= 1) {
        authStore.clear();
    }

    return response;
};

export const api = {
  // Fiches
  async getFiches(): Promise<Fiche[]> {
    const res = await authenticatedFetch(`${BASE_URL}/v1/data/fiches/all`, {
      method: 'GET',
    });
    const data = await res.json();
    return data.results || [];
  },

  async filterFiches(appId: string | string[]): Promise<Fiche[]> {
    const filter = Array.isArray(appId) ? { "$in": appId } : appId;
    const res = await authenticatedFetch(`${BASE_URL}/v1/data/fiches/filter`, {
      method: 'POST',
      body: JSON.stringify({
        mongo_filter: {
          $or: [
            { "app_identifier": filter },
            { "json_data.app_identifier": filter }
          ]
        }
      }),
    });
    const data = await res.json();
    return data.results || [];
  },

  // Gammes
  async saveGamme(gamme: Omit<Gamme, '_id'>): Promise<any> {
    const res = await authenticatedFetch(`${BASE_URL}/v1/data/gammes`, {
      method: 'POST',
      body: JSON.stringify(gamme),
    });
    return res.json();
  },

  async getGammes(): Promise<Gamme[]> {
    const res = await authenticatedFetch(`${BASE_URL}/v1/data/gammes/all`, {
      method: 'GET',
    });
    const data = await res.json();
    return (data.results || []).filter((g: any) => g.json_data?.app_identifier === APP_ID);
  },

  // Prompts
  async getPrompts(): Promise<SystemPrompt[]> {
    const res = await authenticatedFetch(`${BASE_URL}/v1/data/prompts/all`, {
      method: 'GET',
    });
    const data = await res.json();
    return (data.results || []).filter((p: any) => p.json_data?.app_identifier === APP_ID);
  },

  async savePrompt(prompt: Omit<SystemPrompt, '_id'>): Promise<any> {
    const res = await authenticatedFetch(`${BASE_URL}/v1/data/prompts`, {
      method: 'POST',
      body: JSON.stringify(prompt),
    });
    return res.json();
  },

  async deletePrompt(id: string): Promise<any> {
    const res = await authenticatedFetch(`${BASE_URL}/v1/data/prompts/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // AI Assistant
  async askAI(prompt: string, systemInstruction: string) {
    const res = await authenticatedFetch(`${BASE_URL}/v4/assistant/ask`, {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        system_instruction: systemInstruction,
        provider: 'google',
        level: 'mid',
        json_schema: {
          type: "object",
          properties: {
            machine_number: { type: "string" },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  op: { type: "number" },
                  description: { type: "string" }
                },
                required: ["op", "description"]
              }
            }
          },
          required: ["machine_number", "steps"]
        }
      }),
    });
    const data = await res.json();
    return data.results?.parsed_json;
  }
};
