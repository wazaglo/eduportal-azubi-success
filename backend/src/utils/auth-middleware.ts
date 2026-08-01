import { APIGatewayProxyEvent } from 'aws-lambda';
import { ROLES } from './constants';
import { AuthenticationError, AuthorizationError } from './errors';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  level?: string;
  organizationId?: string;
}

export type RoleResolver = (userId: string) => Promise<string | null>;

interface CognitoClaims {
  sub?: string;
  email?: string;
  'cognito:username'?: string;
  role?: string;
  [key: string]: unknown;
}

function getClaims(event: APIGatewayProxyEvent): CognitoClaims {
  return (event.requestContext?.authorizer?.claims as CognitoClaims | undefined) ?? {};
}

export function extractIdentity(event: APIGatewayProxyEvent): { userId: string; email: string } {
  const claims = getClaims(event);
  if (!claims.sub) {
    throw new AuthenticationError('Missing or invalid authentication context');
  }
  return {
    userId: claims.sub,
    email:
      typeof claims.email === 'string' && claims.email.length > 0
        ? claims.email
        : typeof claims['cognito:username'] === 'string'
          ? claims['cognito:username']
          : '',
  };
}

export async function extractAndVerifyUser(
  event: APIGatewayProxyEvent,
  roleResolver?: RoleResolver,
): Promise<AuthUser> {
  const identity = extractIdentity(event);
  const claims = getClaims(event);

  let role: string | null = null;
  if (roleResolver) {
    role = (await roleResolver(identity.userId)) ?? null;
  } else if (typeof claims.role === 'string' && claims.role.length > 0) {
    role = claims.role;
  }

  return {
    ...identity,
    role: role ?? ROLES.STUDENT,
  };
}

export function requireRole(...allowedRoles: string[]) {
  return async (event: APIGatewayProxyEvent, roleResolver?: RoleResolver): Promise<AuthUser> => {
    const user = await extractAndVerifyUser(event, roleResolver);

    if (!allowedRoles.includes(user.role)) {
      throw new AuthorizationError(
        `Requires one of roles: ${allowedRoles.join(', ')}`,
      );
    }

    return user;
  };
}

export const requireAdmin = requireRole(ROLES.ADMIN);
export const requireStudent = requireRole(ROLES.STUDENT);
export const requireSupport = requireRole(ROLES.SUPPORT);
export const requireStaff = requireRole(ROLES.ADMIN, ROLES.SUPPORT);
