import { APIGatewayProxyEvent } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import { JWT, ROLES } from './constants';
import { AuthenticationError, AuthorizationError } from './errors';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  organizationId?: string;
}

export function extractAndVerifyUser(event: APIGatewayProxyEvent): AuthUser {
  const authHeader = event.headers?.Authorization ?? event.headers?.authorization;

  if (!authHeader) {
    throw new AuthenticationError('Missing Authorization header');
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  try {
    const decoded = jwt.verify(token, JWT.SECRET) as AuthUser & { iat?: number; exp?: number };

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      organizationId: decoded.organizationId,
    };
  } catch {
    throw new AuthenticationError('Invalid or expired token');
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (event: APIGatewayProxyEvent): AuthUser => {
    const user = extractAndVerifyUser(event);

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
