import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { NotificationService, SendEmailInput } from '../../core/ports/notification-service';
import { logger } from '../../utils/logger';

export class SESNotificationService implements NotificationService {
  private readonly client: SESClient;
  private readonly defaultSource: string;

  constructor() {
    this.client = new SESClient({
      region: process.env.AWS_REGION ?? 'us-east-1',
    });
    this.defaultSource = process.env.SES_FROM_EMAIL ?? 'noreply@student-support.ai';
  }

  async sendEmail(input: SendEmailInput): Promise<void> {
    try {
      const command = new SendEmailCommand({
        Source: input.source ?? this.defaultSource,
        Destination: {
          ToAddresses: input.to,
          ...(input.cc?.length ? { CcAddresses: input.cc } : {}),
          ...(input.bcc?.length ? { BccAddresses: input.bcc } : {}),
        },
        Message: {
          Subject: {
            Data: input.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: input.body,
              Charset: 'UTF-8',
            },
            ...(input.htmlBody
              ? { Html: { Data: input.htmlBody, Charset: 'UTF-8' } }
              : {}),
          },
        },
        ...(input.replyTo ? { ReplyToAddresses: [input.replyTo] } : {}),
      });

      await this.client.send(command);

      logger.info('Email sent via SES', {
        to: input.to,
        subject: input.subject,
        source: input.source ?? this.defaultSource,
      });
    } catch (error: any) {
      logger.error('Failed to send email via SES', {
        error: error.message,
        to: input.to,
        subject: input.subject,
      });
      throw error;
    }
  }
}
