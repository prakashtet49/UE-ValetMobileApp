export const BASE_URL = 'https://urbaneasevalet-production.up.railway.app';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type ApiError = {
  error?: string;
  message?: string;
  code?: string;
  timestamp?: string;
};

export class ApiException extends Error {
  status: number;
  body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}
