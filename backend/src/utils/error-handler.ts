import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { AppError } from './errors';
import { errorResponse } from './response';
import { logger } from './logger';
import { STATUS_CODES } from './constants';

export function createErrorHandler(correlationId?: string) {
  return (error: Error): APIGatewayProxyResult => {
    if (error instanceof AppError) {
      logger.warn('Application error', {
        correlationId,
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      });

      return errorResponse(error.statusCode, error.code, error.message, error.details);
    }

    logger.error('Unhandled error', {
      correlationId,
      errorName: error.name,
      message: error.message,
      stack: error.stack,
    });

    return errorResponse(
      STATUS_CODES.INTERNAL,
      'INTERNAL_ERROR',
      'An unexpected error occurred',
    );
  };
}

export function wrapHandler(
  handler: (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult>,
) {
  return async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const correlationId = event.headers?.['X-Correlation-Id'] ?? context.awsRequestId;

    try {
      logger.info('Handler invoked', {
        correlationId,
        path: event.path,
        method: event.httpMethod,
        functionName: context.functionName,
      });

      return await handler(event, context);
    } catch (error) {
      const handler = createErrorHandler(correlationId);
      return handler(error as Error);
    }
  };
}
