import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoUserRepository } from '../../infrastructure/repositories/dynamo-user-repository';
import { DynamoConversationRepository } from '../../infrastructure/repositories/dynamo-conversation-repository';
import { DynamoMessageRepository } from '../../infrastructure/repositories/dynamo-message-repository';
import { DynamoCacheRepository } from '../../infrastructure/repositories/dynamo-cache-repository';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { requireAdmin } from '../../utils/auth-middleware';
import { STATUS_CODES } from '../../utils/constants';
import { logger } from '../../utils/logger';

const userRepo = new DynamoUserRepository();
const conversationRepo = new DynamoConversationRepository();
const messageRepo = new DynamoMessageRepository();
const cacheRepo = new DynamoCacheRepository();

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  requireAdmin(event);
  const startTime = Date.now();

  try {
    const [
      activeUsers,
      conversationsByStatus,
      messagesToday,
      cacheCount,
    ] = await Promise.allSettled([
      userRepo.countActive(),
      conversationRepo.countByStatus(),
      messageRepo.countToday(),
      cacheRepo.count(),
    ]);

    const extract = <T>(promise: PromiseSettledResult<T>): T | null =>
      promise.status === 'fulfilled' ? promise.value : null;

    const failedChecks: string[] = [];

    if (activeUsers.status === 'rejected') failedChecks.push('users');
    if (conversationsByStatus.status === 'rejected') failedChecks.push('conversations');
    if (messagesToday.status === 'rejected') failedChecks.push('messages');
    if (cacheCount.status === 'rejected') failedChecks.push('cache');

    const healthy = failedChecks.length === 0;

    return successResponse({
      status: healthy ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      checks: {
        users: { healthy: activeUsers.status === 'fulfilled', count: extract(activeUsers) },
        conversations: { healthy: conversationsByStatus.status === 'fulfilled', byStatus: extract(conversationsByStatus) },
        messages: { healthy: messagesToday.status === 'fulfilled', today: extract(messagesToday) },
        cache: { healthy: cacheCount.status === 'fulfilled', entries: extract(cacheCount) },
      },
      ...(failedChecks.length > 0 ? { failedChecks } : {}),
    }, healthy ? STATUS_CODES.OK : STATUS_CODES.SERVICE_UNAVAILABLE);
  } catch (error: any) {
    logger.error('System health check failed', { error: error.message });

    return successResponse({
      status: 'unhealthy',
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      error: error.message,
    }, STATUS_CODES.SERVICE_UNAVAILABLE);
  }
}

export const main = wrapHandler(handler);
