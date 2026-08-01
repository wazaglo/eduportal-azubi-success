import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { QuestionService } from '../../services/question-service';
import { DynamoQuestionRepository } from '../../infrastructure/repositories/dynamo-question-repository';
import { DynamoCacheRepository } from '../../infrastructure/repositories/dynamo-cache-repository';
import { DynamoAnalyticsRepository } from '../../infrastructure/repositories/dynamo-analytics-repository';
import { CacheService } from '../../services/cache-service';
import { KnowledgeService } from '../../services/knowledge-service';
import { AnalyticsService } from '../../services/analytics-service';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { validateSchema } from '../../utils/validator';
import { extractAndVerifyUser } from '../../utils/auth-middleware';

const askSchema = z.object({
  question: z.string().min(1, 'Question is required').max(2000),
  subject: z.string().trim().min(1).max(100).optional(),
});

const questionRepo = new DynamoQuestionRepository();
const cacheRepo = new DynamoCacheRepository();
const cacheService = new CacheService(cacheRepo);
const knowledgeService = new KnowledgeService(cacheService);
const analyticsService = new AnalyticsService(new DynamoAnalyticsRepository());
const questionService = new QuestionService(questionRepo, knowledgeService, analyticsService);

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const user = extractAndVerifyUser(event);
  const body = JSON.parse(event.body ?? '{}');
  const input = validateSchema(askSchema, body);

  const question = await questionService.ask({
    userId: user.userId,
    question: input.question,
    subject: input.subject,
  });

  return successResponse({
    questionId: question.questionId,
    question: question.question,
    answer: question.response,
    subject: question.subject,
    source: question.source,
    status: question.status,
    documentTitle: question.documentTitle,
    createdAt: question.createdAt,
  }, 201);
}

export const main = wrapHandler(handler);
