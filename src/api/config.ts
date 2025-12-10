export const BASE_URL = 'http://13.50.218.71:80';

export type HttpMethod = 'GET' | 'POST';

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
