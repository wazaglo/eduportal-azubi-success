import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand, GetQueueUrlCommand } from '@aws-sdk/client-sqs';
import { logger } from '../../utils/logger';

interface QueueMessage {
  messageId: string;
  receiptHandle?: string;
  body: Record<string, unknown>;
  attributes?: Record<string, string>;
}

export class SQSQueueService {
  private readonly client: SQSClient;

  constructor() {
    this.client = new SQSClient({
      region: process.env.AWS_REGION ?? 'us-east-1',
    });
  }

  async sendMessage(queueUrl: string, body: Record<string, unknown>, options?: {
    delaySeconds?: number;
    messageGroupId?: string;
    messageDeduplicationId?: string;
  }): Promise<string> {
    try {
      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(body),
        DelaySeconds: options?.delaySeconds,
        MessageGroupId: options?.messageGroupId,
        MessageDeduplicationId: options?.messageDeduplicationId,
      });

      const result = await this.client.send(command);

      logger.info('Message sent to SQS', {
        queueUrl,
        messageId: result.MessageId,
        messageGroupId: options?.messageGroupId,
      });

      return result.MessageId ?? '';
    } catch (error: any) {
      logger.error('Failed to send message to SQS', {
        error: error.message,
        queueUrl,
      });
      throw error;
    }
  }

  async receiveMessages(queueUrl: string, maxMessages: number = 10, waitTimeSeconds: number = 20): Promise<QueueMessage[]> {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: maxMessages,
        WaitTimeSeconds: waitTimeSeconds,
        MessageAttributeNames: ['All'],
        AttributeNames: ['All'],
      });

      const result = await this.client.send(command);

      return (result.Messages ?? []).map((msg) => ({
        messageId: msg.MessageId ?? '',
        receiptHandle: msg.ReceiptHandle,
        body: JSON.parse(msg.Body ?? '{}'),
        attributes: msg.MessageAttributes as Record<string, string> | undefined,
      }));
    } catch (error: any) {
      logger.error('Failed to receive messages from SQS', {
        error: error.message,
        queueUrl,
      });
      return [];
    }
  }

  async deleteMessage(queueUrl: string, receiptHandle: string): Promise<void> {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
      });

      await this.client.send(command);
    } catch (error: any) {
      logger.error('Failed to delete message from SQS', {
        error: error.message,
        queueUrl,
      });
    }
  }

  async getQueueUrl(queueName: string): Promise<string> {
    try {
      const command = new GetQueueUrlCommand({
        QueueName: queueName,
      });

      const result = await this.client.send(command);
      return result.QueueUrl ?? '';
    } catch (error: any) {
      logger.error('Failed to get queue URL', {
        error: error.message,
        queueName,
      });
      throw error;
    }
  }
}
