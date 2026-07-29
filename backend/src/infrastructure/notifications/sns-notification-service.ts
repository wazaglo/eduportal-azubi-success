import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { AlertService, SendAlertInput } from '../../core/ports/notification-service';
import { logger } from '../../utils/logger';

export class SNSAlertService implements AlertService {
  private readonly client: SNSClient;
  private readonly topicArn: string;

  constructor() {
    this.client = new SNSClient({
      region: process.env.AWS_REGION ?? 'us-east-1',
    });
    this.topicArn = process.env.SNS_ALERT_TOPIC_ARN ?? '';
  }

  async sendAlert(input: SendAlertInput): Promise<void> {
    if (!this.topicArn) {
      logger.warn('No SNS topic ARN configured, alert not sent', {
        subject: input.subject,
        severity: input.severity,
      });
      return;
    }

    try {
      const message = JSON.stringify({
        severity: input.severity,
        subject: input.subject,
        message: input.message,
        source: input.source,
        metadata: input.metadata,
        timestamp: new Date().toISOString(),
      });

      const command = new PublishCommand({
        TopicArn: this.topicArn,
        Subject: `[${input.severity}] ${input.subject}`,
        Message: message,
        MessageAttributes: {
          severity: {
            DataType: 'String',
            StringValue: input.severity,
          },
          source: {
            DataType: 'String',
            StringValue: input.source ?? 'ai-student-support',
          },
        },
      });

      await this.client.send(command);

      logger.info('Alert sent via SNS', {
        topicArn: this.topicArn,
        severity: input.severity,
        subject: input.subject,
      });
    } catch (error: any) {
      logger.error('Failed to send alert via SNS', {
        error: error.message,
        topicArn: this.topicArn,
        severity: input.severity,
      });
      throw error;
    }
  }
}
