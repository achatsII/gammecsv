export interface Fiche {
  _id: string;
  app_identifier: string;
  data_type: string;
  description: string;
  json_data: {
    sessionId?: string;
    isComplete?: boolean;
    name?: string;
    auteur?: any;
    notes?: any[];
    author: {
      fullname: string;
      email: string;
    };
    formData: {
      numero_maximo?: string;
      [key: string]: any;
    };
    json_source?: any;
    app_identifier: string;
    createdAt: string;
    [key: string]: any;
  };
}

export interface CustomField {
  key: string;
  value: string;
}

export interface OperationStep {
  op: number;
  description: string;
  custom_fields?: CustomField[];
}

export interface Gamme {
  _id?: string;
  data_type: 'gammes';
  description: string;
  'user-email'?: string;
  json_data: {
    fiche_id: string;
    prompt_id?: string;
    machine_number: string;
    metadata?: CustomField[];
    steps: OperationStep[];
    raw_html?: string;
    app_identifier: string;
    generated_at: string;
  };
}

export interface SystemPrompt {
  _id?: string;
  data_type: 'prompts';
  description: string;
  json_data: {
    name?: string;
    content: string;
    version: number;
    app_identifier: string;
    is_active: boolean;
    export_format?: 'csv' | 'html';
  };
}

export const APP_ID = 'gammecsv';
