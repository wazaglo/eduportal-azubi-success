import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { QuestionService } from '../../services/question-service';
import { DynamoQuestionRepository } from '../../infrastructure/repositories/dynamo-question-repository';
import { DynamoCacheRepository } from '../../infrastructure/repositories/dynamo-cache-repository';
import { DynamoAnalyticsRepository } from '../../infrastructure/repositories/dynamo-analytics-repository';
import { CacheService } from '../../services/cache-service';
import { KnowledgeService } from '../../services/knowledge-service';
import { AnalyticsService } from '../../services/analytics-service';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { validateSchema, paginationSchema } from '../../utils/validator';
import { extractAndVerifyUser } from '../../utils/auth-middleware';

export interface ListHandlerDeps {
  questionService: QuestionService;
}

export function createHandler(deps: ListHandlerDeps) {
  return wrapHandler(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const user = extractAndVerifyUser(event);
    const queryParams = validateSchema(paginationSchema, event.queryStringParameters ?? {});

    const result = await deps.questionService.listByUser(
      user.userId,
      queryParams.limit as number,
      queryParams.nextToken,
    );

    return successResponse(result.questions, 200, {
      limit: queryParams.limit,
      total: result.questions.length,
      ...(result.nextToken ? { nextToken: result.nextToken } : {}),
    });
  });
}

let defaultDeps: ListHandlerDeps | undefined;

function getDefaultDeps(): ListHandlerDeps {
  if (!defaultDeps) {
    const questionRepo = new DynamoQuestionRepository();
    const cacheService = new CacheService(new DynamoCacheRepository());
    const knowledgeService = new KnowledgeService(cacheService);
    const analyticsService = new AnalyticsService(new DynamoAnalyticsRepository());
    defaultDeps = {
      questionService: new QuestionService(questionRepo, knowledgeService, analyticsService),
    };
  }
  return defaultDeps;
}

export const main = wrapHandler((event: APIGatewayProxyEvent, context: Context) => createHandler(getDefaultDeps())(event, context));
