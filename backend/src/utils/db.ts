import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

let docClient: DynamoDBDocumentClient | null = null;

export function getDynamoDbClient(): DynamoDBDocumentClient {
  if (!docClient) {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION ?? 'us-east-1',
      ...(process.env.AWS_ENDPOINT ? { endpoint: process.env.AWS_ENDPOINT } : {}),
    });

    docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    });
  }

  return docClient;
}
