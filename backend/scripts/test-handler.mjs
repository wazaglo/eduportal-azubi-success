import { config } from 'dotenv';
import { resolve, join } from 'path';
import { existsSync, readFileSync } from 'fs';

config({ path: resolve('.env') });

const handlerPath = process.argv[2];
if (!handlerPath) {
  console.error('Usage: node scripts/test-handler.mjs <handler-path>');
  console.error('Example: node scripts/test-handler.mjs admin/system-health');
  console.error('Example: node scripts/test-handler.mjs chat/send-message');
  process.exit(1);
}

const jsPath = join('dist', `${handlerPath}.js`);
if (!existsSync(jsPath)) {
  console.error(`Handler not found: ${jsPath}`);
  process.exit(1);
}

const eventPath = join('src/functions', `${handlerPath}.test-event.json`);
const mockEvent = existsSync(eventPath)
  ? JSON.parse(readFileSync(eventPath, 'utf8'))
  : {
      httpMethod: 'POST',
      path: `/${handlerPath}`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: process.env.TEST_AUTH_TOKEN || 'Bearer test-token',
      },
      body: JSON.stringify({}),
      queryStringParameters: {},
      pathParameters: {},
      requestContext: { authorizer: { claims: {} } },
    };

const context = {
  functionName: handlerPath.replace('/', '-'),
  awsRequestId: `test-${Date.now()}`,
  callbackWaitsForEmptyEventLoop: false,
  getRemainingTimeInMillis: () => 29000,
};

async function run() {
  try {
    console.log(`\n=== Testing handler: ${handlerPath} ===`);
    console.log(`Loading: ${jsPath}\n`);

    const mod = await import(resolve(jsPath));
    const handler = mod.main || mod.handler || mod.default;

    if (!handler) {
      console.error('No exported main/handler function found');
      console.error('Exports:', Object.keys(mod));
      process.exit(1);
    }

    const startTime = Date.now();
    const result = await handler(mockEvent, context);
    const elapsed = Date.now() - startTime;

    console.log(`Response (${elapsed}ms):`);
    console.log(JSON.stringify(result, null, 2));

    if (result.statusCode >= 400) {
      console.error(`\n⚠ Handler returned error status: ${result.statusCode}`);
      process.exit(1);
    }

    console.log(`\n✓ Test passed`);
  } catch (error) {
    console.error('Handler failed:', error);
    process.exit(1);
  }
}

run();
