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
import { extractAndVerifyUser, RoleResolver } from '../../utils/auth-middleware';
import { defaultRoleResolver } from '../../utils/role-resolver';

const askSchema = z.object({
  question: z.string().min(1, 'Question is required').max(2000),
  subject: z.string().trim().min(1).max(100).optional(),
});

export interface AskHandlerDeps {
  questionService: QuestionService;
  roleResolver?: RoleResolver;
}

export function createHandler(deps: AskHandlerDeps) {
  return wrapHandler(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const user = await extractAndVerifyUser(event, deps.roleResolver);
    const body = JSON.parse(event.body ?? '{}');
    const input = validateSchema(askSchema, body);

    const question = await deps.questionService.ask({
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
      modelUsed: question.modelUsed,
      createdAt: question.createdAt,
    }, 201);
  });
}

let defaultDeps: AskHandlerDeps | undefined;

function getDefaultDeps(): AskHandlerDeps {
  if (!defaultDeps) {
    const questionRepo = new DynamoQuestionRepository();
    const cacheRepo = new DynamoCacheRepository();
    const cacheService = new CacheService(cacheRepo);
    const analyticsService = new AnalyticsService(new DynamoAnalyticsRepository());
    const knowledgeService = new KnowledgeService(cacheService, analyticsService);
    defaultDeps = {
      questionService: new QuestionService(questionRepo, knowledgeService, analyticsService),
      roleResolver: defaultRoleResolver(),
    };
  }
  return defaultDeps;
}

export const main = wrapHandler((event: APIGatewayProxyEvent, context: Context) => createHandler(getDefaultDeps())(event, context));
