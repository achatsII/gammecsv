import { Fiche, Gamme, SystemPrompt, APP_ID } from '../types';

const BASE_URL = 'https://qa.gateway.intelligenceindustrielle.com/api';
// @ts-ignore
const TOKEN = import.meta.env.NEXT_PUBLIC_BEARER_TOKEN;

const getHeaders = () => ({
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
});

export const api = {
  // Fiches
  async getFiches(): Promise<Fiche[]> {
    const res = await fetch(`${BASE_URL}/v1/data/fiches/all`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json();
    // Filter by app_identifier if possible, or just return all and we filter in UI
    // The guide suggests using /filter for precision
    return data.results || [];
  },

  async filterFiches(appId: string): Promise<Fiche[]> {
    const res = await fetch(`${BASE_URL}/v1/data/fiches/filter`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        mongo_filter: {
          "json_data.app_identifier": appId
        }
      }),
    });
    const data = await res.json();
    return data.results || [];
  },

  // Gammes
  async saveGamme(gamme: Omit<Gamme, '_id'>): Promise<any> {
    const res = await fetch(`${BASE_URL}/v1/data/gammes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(gamme),
    });
    return res.json();
  },

  async getGammes(): Promise<Gamme[]> {
    const res = await fetch(`${BASE_URL}/v1/data/gammes/all`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json();
    return (data.results || []).filter((g: any) => g.json_data?.app_identifier === APP_ID);
  },

  // Prompts
  async getPrompts(): Promise<SystemPrompt[]> {
    const res = await fetch(`${BASE_URL}/v1/data/prompts/all`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json();
    return (data.results || []).filter((p: any) => p.json_data?.app_identifier === APP_ID);
  },

  async savePrompt(prompt: Omit<SystemPrompt, '_id'>): Promise<any> {
    const res = await fetch(`${BASE_URL}/v1/data/prompts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(prompt),
    });
    return res.json();
  },

  async deletePrompt(id: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/v1/data/prompts/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.json();
  },

  // AI Assistant
  async askAI(prompt: string, systemInstruction: string) {
    const res = await fetch(`${BASE_URL}/v4/assistant/ask`, {
      method: 'POST',
      headers: getHeaders(),
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
