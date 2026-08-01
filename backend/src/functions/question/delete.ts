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
import { extractAndVerifyUser } from '../../utils/auth-middleware';

export interface DeleteHandlerDeps {
  questionService: QuestionService;
}

export function createHandler(deps: DeleteHandlerDeps) {
  return wrapHandler(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const user = extractAndVerifyUser(event);
    const questionId = event.pathParameters?.id;

    if (!questionId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: { code: 'MISSING_ID', message: 'Question ID is required' } }),
      };
    }

    await deps.questionService.deleteQuestion(questionId, user.userId, user.role);

    return successResponse({ message: 'Question deleted successfully' });
  });
}

let defaultDeps: DeleteHandlerDeps | undefined;

function getDefaultDeps(): DeleteHandlerDeps {
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
