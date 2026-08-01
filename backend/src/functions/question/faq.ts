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
import { extractAndVerifyUser, RoleResolver } from '../../utils/auth-middleware';
import { defaultRoleResolver } from '../../utils/role-resolver';

export interface FaqHandlerDeps {
  questionService: QuestionService;
  roleResolver?: RoleResolver;
}

export function createHandler(deps: FaqHandlerDeps) {
  return wrapHandler(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const user = await extractAndVerifyUser(event, deps.roleResolver);
    const queryParams = validateSchema(paginationSchema, event.queryStringParameters ?? {});

    const faq = await deps.questionService.getFaq(queryParams.limit as number);

    return successResponse(faq, 200, { limit: queryParams.limit, total: faq.length });
  });
}

let defaultDeps: FaqHandlerDeps | undefined;

function getDefaultDeps(): FaqHandlerDeps {
  if (!defaultDeps) {
    const questionRepo = new DynamoQuestionRepository();
    const cacheService = new CacheService(new DynamoCacheRepository());
    const knowledgeService = new KnowledgeService(cacheService);
    const analyticsService = new AnalyticsService(new DynamoAnalyticsRepository());
    defaultDeps = {
      questionService: new QuestionService(questionRepo, knowledgeService, analyticsService),
      roleResolver: defaultRoleResolver(),
    };
  }
  return defaultDeps;
}

export const main = wrapHandler((event: APIGatewayProxyEvent, context: Context) => createHandler(getDefaultDeps())(event, context));
