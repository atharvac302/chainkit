/**
 * ChainKit CLI - Example Command
 *
 * Generates runnable, end-to-end TypeScript code examples showcasing
 * ChainKit SDK record anchoring, status polling, verification, and error handling.
 *
 * @module @chainkit/cli/commands/example
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import type { Command } from 'commander';

/**
 * Options for the example command.
 */
export interface ExampleOptions {
  /**
   * Destination path for the generated file.
   * Defaults to './chainkit-records-example.ts'.
   */
  output?: string;

  /**
   * Print the code directly to standard output instead of saving to a file.
   */
  print?: boolean;

  /**
   * Overwrite existing destination file if it exists.
   */
  force?: boolean;
}

/**
 * Full, runnable TypeScript code template for record lifecycle management.
 */
export const RECORDS_EXAMPLE_CONTENT = `/**
 * ChainKit End-to-End Example: Records Anchoring & Verification
 *
 * This script demonstrates the complete lifecycle of anchoring an immutable
 * audit record on ChainKit, tracking its confirmation on the blockchain,
 * and performing cryptographic verification against tampering.
 *
 * Prerequisites:
 *   1. Install dependencies: npm install @chainkit/sdk
 *   2. Set environment variables:
 *        export CHAINKIT_API_KEY="your_api_key_here"
 *        export CHAINKIT_BASE_URL="http://localhost:3001" (optional)
 *   3. Run with tsx or ts-node:
 *        npx tsx this-file.ts
 */

import {
  AuthenticationError,
  ChainKit,
  ChainKitError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from '@chainkit/sdk';

async function run(): Promise<void> {
  const apiKey = process.env.CHAINKIT_API_KEY;

  if (!apiKey) {
    console.error('Error: CHAINKIT_API_KEY environment variable is missing.');
    console.error('Set it with: export CHAINKIT_API_KEY="your_api_key"');
    process.exit(1);
  }

  // 1. Initialize the ChainKit SDK Client
  console.log('=== Step 1: Initializing ChainKit Client ===');
  const chainkit = new ChainKit({
    apiKey,
    baseUrl: process.env.CHAINKIT_BASE_URL ?? 'http://localhost:3001',
    timeout: 30000,
  });
  console.log('ChainKit client initialized successfully.\\n');

  try {
    // 2. Prepare payload and create the record
    console.log('=== Step 2: Anchoring Data Record ===');
    const auditRecord = {
      action: 'USER_ROLE_UPDATED',
      actor: 'admin@organization.com',
      targetUser: 'user_4829',
      assignedRole: 'SecurityAdministrator',
      timestamp: new Date().toISOString(),
      metadata: {
        ipAddress: '192.168.1.100',
        userAgent: 'Internal-Admin-Portal/2.4',
      },
    };

    const serializedContent = JSON.stringify(auditRecord, null, 2);
    const idempotencyKey = \`audit-\${auditRecord.targetUser}-\${Date.now()}\`;

    console.log('Submitting record to ChainKit...');
    const created = await chainkit.records.create({
      type: 'audit_log',
      externalId: \`audit_\${auditRecord.targetUser}\`,
      content: serializedContent,
      idempotencyKey,
    });

    console.log(\`Record ID:       \${created.recordId}\`);
    console.log(\`Initial Status:  \${created.status}\`);
    console.log(\`Content Digest:  \${created.contentHash}\`);
    console.log(\`Created At:      \${created.createdAt}\\n\`);

    // 3. Poll for blockchain confirmation
    console.log('=== Step 3: Polling for Blockchain Confirmation ===');
    const recordId = created.recordId;
    let attempts = 0;
    const maxAttempts = 15;
    const pollIntervalMs = 2000;
    let latestRecord = created;

    while (latestRecord.status !== 'CONFIRMED' && attempts < maxAttempts) {
      attempts++;
      console.log(\`[Polling attempt \${attempts}/\${maxAttempts}] Waiting \${pollIntervalMs}ms...\`);
      await new Promise((res) => setTimeout(res, pollIntervalMs));

      latestRecord = await chainkit.records.get(recordId);
      console.log(\`   Current status: \${latestRecord.status}\`);

      if (latestRecord.status === 'CONFIRMED') {
        console.log('\\nRecord successfully confirmed on blockchain!');
        console.log(\`Transaction Hash: \${latestRecord.transactionHash ?? 'Pending mempool'}\`);
        break;
      }

      if (latestRecord.status === 'FAILED') {
        throw new Error('Record transaction failed during blockchain confirmation.');
      }
    }

    // 4. Retrieve Transaction Details if available
    if (latestRecord.transactionId) {
      console.log('\\n=== Step 4: Querying Relayer Transaction ===');
      try {
        const tx = await chainkit.transactions.get(latestRecord.transactionId);
        console.log(\`Transaction ID:   \${tx.id}\`);
        console.log(\`Chain ID:         \${tx.chainId}\`);
        console.log(\`Tx Status:        \${tx.status}\`);
        console.log(\`Submitted At:     \${tx.submittedAt}\`);
        console.log(\`Confirmed At:     \${tx.confirmedAt ?? 'Pending'}\`);
      } catch (txErr: unknown) {
        console.warn('Could not query transaction details:', txErr);
      }
    }

    // 5. Verify Authenticity (Positive test)
    console.log('\\n=== Step 5: Cryptographic Verification (Authentic Payload) ===');
    const positiveVerify = await chainkit.records.verify(recordId, {
      content: serializedContent,
    });

    console.log(\`Verified: \${positiveVerify.verified ? 'YES (Valid)' : 'NO (Failed)'}\`);
    console.log(\`Status:   \${positiveVerify.status}\`);

    // 6. Verify Tampering Detection (Negative test)
    console.log('\\n=== Step 6: Tampering Detection (Altered Payload) ===');
    const alteredPayload = JSON.stringify({
      ...auditRecord,
      assignedRole: 'SuperUserAllPermissions', // Tampered field
    });

    const negativeVerify = await chainkit.records.verify(recordId, {
      content: alteredPayload,
    });

    console.log(\`Tampered Content Verified: \${negativeVerify.verified ? 'YES' : 'NO (Tamper Detected)'}\`);
    if (!negativeVerify.verified) {
      console.log(\`Diagnostic Reason:        \${negativeVerify.reason ?? 'Digest mismatch'}\`);
    }

    console.log('\\n=== All ChainKit operations completed successfully! ===');
  } catch (error: unknown) {
    console.error('\\n=== ChainKit Error Caught ===');
    if (error instanceof ValidationError) {
      console.error(\`Validation Error [\${error.code}]: \${error.message}\`);
    } else if (error instanceof AuthenticationError) {
      console.error(\`Authentication Error [\${error.code}]: \${error.message}\`);
      console.error('Check that your CHAINKIT_API_KEY is valid and active.');
    } else if (error instanceof NotFoundError) {
      console.error(\`Not Found Error [\${error.code}]: \${error.message}\`);
    } else if (error instanceof RateLimitError) {
      console.error(\`Rate Limit Exceeded [\${error.code}]: \${error.message}\`);
      if (error.retryAfter) {
        console.error(\`Retry after \${error.retryAfter} seconds.\`);
      }
    } else if (error instanceof ChainKitError) {
      console.error(\`ChainKit Platform Error [\${error.code} | HTTP \${error.statusCode}]: \${error.message}\`);
      if (error.requestId) {
        console.error(\`Request ID: \${error.requestId}\`);
      }
    } else {
      console.error('Unexpected error:', error);
    }
    process.exit(1);
  }
}

run().catch((fatal: unknown) => {
  console.error('Fatal execution error:', fatal);
  process.exit(1);
});
`;

/**
 * Executes the `example` command logic.
 *
 * @param exampleType - Type of example to generate (e.g. 'records').
 * @param options - Generation options (output path, print flag).
 */
export async function runExample(
  exampleType: string = 'records',
  options: ExampleOptions = {}
): Promise<void> {
  const normalizedType = exampleType.toLowerCase().trim();

  if (normalizedType !== 'records') {
    console.error(
      chalk.red(`Error: Unknown example type "${exampleType}". Supported types: records`)
    );
    process.exit(1);
  }

  if (options.print) {
    console.log(RECORDS_EXAMPLE_CONTENT);
    return;
  }

  const defaultFileName = 'chainkit-records-example.ts';
  const outputPath = path.resolve(process.cwd(), options.output ?? defaultFileName);

  if (fs.existsSync(outputPath) && !options.force) {
    console.warn(
      chalk.yellow(`⚠ Warning: File already exists at: ${outputPath}`)
    );
    console.log(chalk.gray('Use --force to overwrite or specify a different path with --output.'));
    return;
  }

  fs.writeFileSync(outputPath, RECORDS_EXAMPLE_CONTENT, 'utf8');

  console.log(chalk.bold.green('\n✔ Example script generated successfully!\n'));
  console.log(`  File: ${chalk.cyan(outputPath)}\n`);
  console.log(chalk.bold('To run this example:'));
  console.log(`  1. Configure your environment:`);
  console.log(`     ${chalk.yellow('export CHAINKIT_API_KEY="your_api_key_here"')}`);
  console.log(`  2. Execute with tsx:`);
  console.log(`     ${chalk.yellow(`npx tsx "${path.relative(process.cwd(), outputPath)}"`)}\n`);
}

/**
 * Register the example command with the Commander program.
 *
 * @param program - Commander program instance.
 */
export function registerExampleCommand(program: Command): void {
  program
    .command('example')
    .argument('[type]', 'Type of example to generate (records)', 'records')
    .description('Generate an example record creation and verification script')
    .option('-o, --output <file>', 'Specify destination file path')
    .option('-p, --print', 'Print example code directly to stdout')
    .option('-f, --force', 'Overwrite destination file if it already exists')
    .action(async (type: string, options: ExampleOptions) => {
      await runExample(type, options);
    });
}
