import { APIGatewayProxyResult } from 'aws-lambda';
import { STATUS_CODES } from './constants';

export interface ApiResponseBody<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    correlationId?: string;
  };
}

export function successResponse<T>(
  data: T,
  statusCode: number = STATUS_CODES.OK,
  metadata?: ApiResponseBody['metadata'],
): APIGatewayProxyResult {
  const body: ApiResponseBody<T> = {
    success: true,
    data,
    ...(metadata ? { metadata } : {}),
  };

  return {
    statusCode,
    headers: getDefaultHeaders(),
    body: JSON.stringify(body),
  };
}

export function errorResponse(
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): APIGatewayProxyResult {
  const body: ApiResponseBody = {
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  };

  return {
    statusCode,
    headers: getDefaultHeaders(),
    body: JSON.stringify(body),
  };
}

export function getDefaultHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN ?? '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Correlation-Id',
  };
}
