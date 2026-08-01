import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AdminInitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ResendConfirmationCodeCommand,
  AdminGetUserCommand,
  type AuthenticationResultType,
} from '@aws-sdk/client-cognito-identity-provider';
import { v4 as uuidv4 } from 'uuid';
import { COGNITO } from '../utils/constants';
import { UserRepository } from '../core/ports/user-repository';
import { AnalyticsRepository } from '../core/ports/analytics-repository';
import { AuthenticationError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';
import { User, CreateUserInput } from '../core/entities/user';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION ?? 'eu-west-1',
});

interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  role?: User['role'];
  level?: User['level'];
  department?: string;
  enrollmentYear?: number;
  courseOfStudy?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface TokenResult {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn: number;
}

interface AuthResult {
  user: User;
  tokens: TokenResult | null;
}

function toTokenResult(authResult: AuthenticationResultType, existingRefreshToken?: string): TokenResult {
  if (!authResult.AccessToken) {
    throw new AuthenticationError('Cognito did not return an access token');
  }
  return {
    accessToken: authResult.AccessToken,
    refreshToken: authResult.RefreshToken ?? existingRefreshToken,
    idToken: authResult.IdToken,
    expiresIn: authResult.ExpiresIn ?? 3600,
  };
}

export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly analyticsRepo: AnalyticsRepository,
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('User with this email already exists');
    }

    try {
      const signUpCmd = new SignUpCommand({
        ClientId: COGNITO.CLIENT_ID,
        Username: input.email,
        Password: input.password,
        UserAttributes: [
          { Name: 'email', Value: input.email },
          { Name: 'name', Value: input.fullName },
        ],
      });

      await cognitoClient.send(signUpCmd);
    } catch (error: any) {
      logger.error('Cognito signup failed', { error: error.message, email: input.email });
      throw new AuthenticationError(`Registration failed: ${error.message}`);
    }

    let cognitoUser;
    try {
      const getUserCmd = new AdminGetUserCommand({
        UserPoolId: COGNITO.USER_POOL_ID,
        Username: input.email,
      });
      cognitoUser = await cognitoClient.send(getUserCmd);
    } catch {
      throw new AuthenticationError('Failed to verify Cognito user creation');
    }

    const createUserInput: CreateUserInput = {
      email: input.email,
      fullName: input.fullName,
      role: input.role ?? 'student',
      isActive: true,
      level: input.level,
      department: input.department,
      enrollmentYear: input.enrollmentYear,
      courseOfStudy: input.courseOfStudy,
      cognitoSub: cognitoUser.UserAttributes?.find(a => a.Name === 'sub')?.Value ?? '',
    };

    const user = await this.userRepo.create(createUserInput);

    await this.analyticsRepo.create({
      eventType: 'user_registered',
      userId: user.userId,
      properties: { role: user.role, email: user.email },
    });

    let tokens: TokenResult | null = null;
    try {
      const authCmd = new InitiateAuthCommand({
        ClientId: COGNITO.CLIENT_ID,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: input.email,
          PASSWORD: input.password,
        },
      });
      const authResult = await cognitoClient.send(authCmd);
      tokens = toTokenResult(authResult.AuthenticationResult ?? {});
    } catch {
      // New users are usually unconfirmed until they verify their email, so
      // tokens are only available once the account is confirmed. The client
      // directs the user through email verification and then login.
      tokens = null;
    }

    return { user, tokens };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    try {
      const authCmd = new InitiateAuthCommand({
        ClientId: COGNITO.CLIENT_ID,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: input.email,
          PASSWORD: input.password,
        },
      });

      const authResult = await cognitoClient.send(authCmd);
      const tokens = toTokenResult(authResult.AuthenticationResult ?? {});

      const user = await this.userRepo.findByEmail(input.email);
      if (!user) {
        throw new AuthenticationError('User not found in system');
      }

      if (!user.isActive) {
        throw new AuthenticationError('Account is deactivated');
      }

      await this.analyticsRepo.create({
        eventType: 'user_login',
        userId: user.userId,
        properties: { email: user.email },
      });

      return { user, tokens };
    } catch (error: any) {
      logger.error('Login failed', { error: error.message, email: input.email });
      throw new AuthenticationError(`Login failed: ${error.message}`);
    }
  }

  async verifyEmail(email: string, code: string): Promise<void> {
    try {
      const confirmCmd = new ConfirmSignUpCommand({
        ClientId: COGNITO.CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
      });

      await cognitoClient.send(confirmCmd);

      const user = await this.userRepo.findByEmail(email);
      if (user) {
        await this.userRepo.update(user.userId, { isActive: true });
      }
    } catch (error: any) {
      logger.error('Email verification failed', { error: error.message, email });
      throw new AuthenticationError(`Verification failed: ${error.message}`);
    }
  }

  async resendVerificationCode(email: string): Promise<void> {
    try {
      const resendCmd = new ResendConfirmationCodeCommand({
        ClientId: COGNITO.CLIENT_ID,
        Username: email,
      });
      await cognitoClient.send(resendCmd);
    } catch (error: any) {
      logger.error('Resend code failed', { error: error.message, email });
      throw new AuthenticationError(`Failed to resend code: ${error.message}`);
    }
  }

  async resetPasswordRequest(email: string): Promise<void> {
    try {
      const forgotCmd = new ForgotPasswordCommand({
        ClientId: COGNITO.CLIENT_ID,
        Username: email,
      });
      await cognitoClient.send(forgotCmd);
    } catch (error: any) {
      logger.error('Password reset request failed', { error: error.message, email });
      throw new AuthenticationError(`Password reset request failed: ${error.message}`);
    }
  }

  async confirmResetPassword(email: string, code: string, newPassword: string): Promise<void> {
    try {
      const confirmCmd = new ConfirmForgotPasswordCommand({
        ClientId: COGNITO.CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
      });
      await cognitoClient.send(confirmCmd);
    } catch (error: any) {
      logger.error('Password reset confirmation failed', { error: error.message, email });
      throw new AuthenticationError(`Password reset failed: ${error.message}`);
    }
  }

  async refreshToken(refreshTokenValue: string): Promise<TokenResult> {
    try {
      const authCmd = new AdminInitiateAuthCommand({
        UserPoolId: COGNITO.USER_POOL_ID,
        ClientId: COGNITO.CLIENT_ID,
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        AuthParameters: {
          REFRESH_TOKEN: refreshTokenValue,
        },
      });
      const authResult = await cognitoClient.send(authCmd);
      return toTokenResult(authResult.AuthenticationResult ?? {}, refreshTokenValue);
    } catch (error: any) {
      logger.error('Token refresh failed', { error: error.message });
      throw new AuthenticationError('Token refresh failed');
    }
  }
}
