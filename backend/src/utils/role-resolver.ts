import { DynamoUserRepository } from '../infrastructure/repositories/dynamo-user-repository';
import { RoleResolver } from './auth-middleware';

export function defaultRoleResolver(): RoleResolver {
  const userRepo = new DynamoUserRepository();
  return async (userId: string): Promise<string | null> => {
    const user = await userRepo.findById(userId);
    return user?.role ?? null;
  };
}
