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

    // cache: 'no-store' forces the browser to always fetch fresh data from the server
    const response = await fetch(url, { cache: 'no-store', ...options, headers });

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

  async saveGamme(gamme: Omit<Gamme, '_id'>): Promise<any> {
    const res = await authenticatedFetch(`${BASE_URL}/v1/data/gammes`, {
      method: 'POST',
      body: JSON.stringify(gamme),
    });
    return res.json();
  },

  async updateGamme(id: string, gamme: Gamme): Promise<any> {
    const { _id, ...payload } = gamme;
    const res = await authenticatedFetch(`${BASE_URL}/v1/data/gammes/one/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error("updateGamme failed with status:", res.status);
    return res.json();
  },

  async deleteGamme(id: string): Promise<any> {
    const res = await authenticatedFetch(`${BASE_URL}/v1/data/gammes/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async updateFiche(id: string, fiche: Fiche): Promise<any> {
    const { _id, ...payload } = fiche;
    const res = await authenticatedFetch(`${BASE_URL}/v1/data/fiches/one/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error("updateFiche failed with status:", res.status);
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

  async updatePrompt(id: string, prompt: SystemPrompt): Promise<any> {
    const { _id, ...payload } = prompt;
    const res = await authenticatedFetch(`${BASE_URL}/v1/data/prompts/one/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error("updatePrompt failed with status:", res.status);
    return res.json();
  },

  async deletePrompt(id: string): Promise<any> {
    const res = await authenticatedFetch(`${BASE_URL}/v1/data/prompts/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // AI Assistant
  async askAI(prompt: string, systemInstruction: string, format: 'csv' | 'html' = 'csv') {
    const payload: any = {
      prompt,
      system_instruction: systemInstruction,
      provider: 'google',
      level: 'high',
    };

    if (format === 'csv') {
      payload.json_schema = {
        type: "object",
        properties: {
          machine_number: { type: "string" },
          metadata: {
            type: "array",
            description: "Top-level custom fields requested by the system instruction (e.g. supervisor, building).",
            items: {
              type: "object",
              properties: {
                key: { type: "string", description: "The exact name of the custom field." },
                value: { type: "string", description: "The value of the custom field." }
              },
              required: ["key", "value"]
            }
          },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                op: { type: "number" },
                description: { type: "string" },
                custom_fields: {
                  type: "array",
                  description: "Step-specific custom fields requested by the system instruction (e.g. duration, detail, tools).",
                  items: {
                    type: "object",
                    properties: {
                      key: { type: "string", description: "The exact name of the custom field." },
                      value: { type: "string", description: "The value of the custom field." }
                    },
                    required: ["key", "value"]
                  }
                }
              },
              required: ["op", "description"]
            }
          }
        },
        required: ["machine_number", "steps"]
      };
    }

    const res = await authenticatedFetch(`${BASE_URL}/v4/assistant/ask`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    
    const data = await res.json();
    console.log("AskAI raw response:", data);
    
    if (format === 'html') {
      const htmlText = data.results?.assistant_response
        || data.assistant_response
        || data.results?.answer 
        || data.results?.text 
        || data.results?.content
        || data.results?.output
        || data.results?.parsed_json 
        || data.answer 
        || data.text 
        || data.content 
        || data.output
        || (Array.isArray(data) && data[0]?.output)
        || (Array.isArray(data) && data[0]?.text)
        || (typeof data === 'string' ? data : JSON.stringify(data, null, 2));
      return htmlText;
    }
    return data.results?.parsed_json;
  }
};
