import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ResendConfirmationCodeCommand,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { COGNITO, JWT } from '../utils/constants';
import { UserRepository } from '../core/ports/user-repository';
import { AnalyticsRepository } from '../core/ports/analytics-repository';
import { AuthenticationError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';
import { User, CreateUserInput } from '../core/entities/user';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
});

interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  role?: User['role'];
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
  tokens: TokenResult;
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

    const tokens = await this.generateTokens(user);

    return { user, tokens };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    try {
      const authCmd = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: COGNITO.CLIENT_ID,
        AuthParameters: {
          USERNAME: input.email,
          PASSWORD: input.password,
        },
      });

      const authResult = await cognitoClient.send(authCmd);

      const user = await this.userRepo.findByEmail(input.email);
      if (!user) {
        throw new AuthenticationError('User not found in system');
      }

      if (!user.isActive) {
        throw new AuthenticationError('Account is deactivated');
      }

      const tokens: TokenResult = {
        accessToken: authResult.AuthenticationResult?.AccessToken ?? '',
        refreshToken: authResult.AuthenticationResult?.RefreshToken,
        idToken: authResult.AuthenticationResult?.IdToken,
        expiresIn: authResult.AuthenticationResult?.ExpiresIn ?? 3600,
      };

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
      const authCmd = new InitiateAuthCommand({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: COGNITO.CLIENT_ID,
        AuthParameters: {
          REFRESH_TOKEN: refreshTokenValue,
        },
      });

      const result = await cognitoClient.send(authCmd);

      return {
        accessToken: result.AuthenticationResult?.AccessToken ?? '',
        idToken: result.AuthenticationResult?.IdToken,
        expiresIn: result.AuthenticationResult?.ExpiresIn ?? 3600,
      };
    } catch (error: any) {
      logger.error('Token refresh failed', { error: error.message });
      throw new AuthenticationError('Token refresh failed');
    }
  }

  private async generateTokens(user: User): Promise<TokenResult> {
    const accessToken = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
      JWT.SECRET,
      { expiresIn: JWT.ACCESS_TOKEN_EXPIRY, issuer: JWT.ISSUER },
    );

    const refreshToken = jwt.sign(
      { userId: user.userId, type: 'refresh' },
      JWT.SECRET,
      { expiresIn: JWT.REFRESH_TOKEN_EXPIRY, issuer: JWT.ISSUER },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
    };
  }
}
