/**
 * ChainKit CLI - Init Command
 *
 * Scaffolds ChainKit configuration, environment variables, example code,
 * and AI agent skill files in the target project directory.
 *
 * @module @chainkit/cli/commands/init
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import type { Command } from 'commander';
import ora from 'ora';
import prompts from 'prompts';

/**
 * Options for the init command.
 */
export interface InitOptions {
  /**
   * Skip interactive prompts and accept all defaults.
   */
  yes?: boolean;

  /**
   * Working directory to initialize (defaults to process.cwd()).
   */
  cwd?: string;

  /**
   * Automatically install @chainkit/sdk dependency via package manager.
   */
  install?: boolean;
}

/**
 * Default content for `.env.example`.
 */
const ENV_EXAMPLE_CONTENT = `# ─── ChainKit API Configuration ───
# Obtain your secret API key from the ChainKit dashboard.
# NEVER commit your real .env file or production credentials to version control.
CHAINKIT_API_KEY=ck_test_replace_with_your_api_key
CHAINKIT_BASE_URL=http://localhost:3001
`;

/**
 * Code template for `src/chainkit-example.ts`.
 */
const EXAMPLE_CODE_TEMPLATE = `/**
 * ChainKit Integration Example
 *
 * Demonstrates how to initialize the ChainKit SDK, anchor an immutable record,
 * poll for blockchain confirmation, and verify data integrity.
 */

import { AuthenticationError, ChainKit, ChainKitError, ValidationError } from '@chainkit/sdk';

async function main(): Promise<void> {
  const apiKey = process.env.CHAINKIT_API_KEY;
  if (!apiKey) {
    console.error('Error: CHAINKIT_API_KEY environment variable is not defined.');
    console.error('Please configure it in your .env file or environment.');
    process.exit(1);
  }

  // 1. Initialize the ChainKit SDK client
  const chainkit = new ChainKit({
    apiKey,
    baseUrl: process.env.CHAINKIT_BASE_URL ?? 'http://localhost:3001',
    timeout: 30000,
  });

  try {
    console.log('1. Submitting record for anchoring...');

    const samplePayload = {
      orderId: 'ORD-98765',
      customer: 'Acme Corporation',
      amountUsd: 1499.99,
      timestamp: new Date().toISOString(),
    };

    const record = await chainkit.records.create({
      type: 'invoice',
      externalId: samplePayload.orderId,
      content: JSON.stringify(samplePayload),
      idempotencyKey: \`order-\${samplePayload.orderId}-v1\`,
    });

    console.log(\`   Record registered successfully! ID: \${record.recordId}\`);
    console.log(\`   Status: \${record.status} | Content Hash: \${record.contentHash}\`);

    // 2. Poll until on-chain confirmation or timeout
    console.log('2. Polling for blockchain confirmation...');
    let currentStatus = record.status;
    let attempts = 0;
    const maxAttempts = 12;

    while (currentStatus !== 'CONFIRMED' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      attempts++;

      const updated = await chainkit.records.get(record.recordId);
      currentStatus = updated.status;
      console.log(\`   [Attempt \${attempts}] Current status: \${currentStatus}\`);

      if (currentStatus === 'CONFIRMED') {
        console.log(\`   Transaction confirmed on-chain!\`);
        console.log(\`   Transaction Hash: \${updated.transactionHash ?? 'N/A'}\`);
        break;
      }

      if (currentStatus === 'FAILED') {
        throw new Error('On-chain record anchoring transaction failed.');
      }
    }

    // 3. Cryptographically verify the record
    console.log('3. Verifying record integrity against the blockchain...');
    const verifyResult = await chainkit.records.verify(record.recordId, {
      content: JSON.stringify(samplePayload),
    });

    if (verifyResult.verified) {
      console.log('   Verification successful: Data matches on-chain cryptographic digest!');
    } else {
      console.warn(\`   Verification failed: \${verifyResult.reason ?? 'Digest mismatch'}\`);
    }
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      console.error('Validation Error:', error.message, \`(code: \${error.code})\`);
    } else if (error instanceof AuthenticationError) {
      console.error('Authentication Error:', error.message, '- please verify your API key.');
    } else if (error instanceof ChainKitError) {
      console.error(\`ChainKit Error [\${error.code}]: \${error.message}\`);
    } else {
      console.error('Unexpected error:', error);
    }
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
`;

/**
 * Agent skill document content for `.chainkit/SKILL.md`.
 */
const AGENT_SKILL_TEMPLATE = `# ChainKit Agent Skill

> Version: 0.1.0  
> Target SDK: @chainkit/sdk

## Overview
ChainKit is a Blockchain-as-a-Service (BaaS) platform providing immutable data record
anchoring, automated relayer transaction submission, and cryptographic tamper verification.

## SDK Reference
- **Initialization**: \`const chainkit = new ChainKit({ apiKey: process.env.CHAINKIT_API_KEY })\`
- **Create Record**: \`chainkit.records.create({ type, externalId, content | contentHash, idempotencyKey? })\`
- **Get Record**: \`chainkit.records.get(recordId)\`
- **Verify Record**: \`chainkit.records.verify(recordId, { content | contentHash })\`
- **List Records**: \`chainkit.records.list({ page?, limit?, type?, status? })\`
- **Get Transaction**: \`chainkit.transactions.get(transactionId)\`

## Security Guidelines
1. Never commit \`.env\` or expose \`CHAINKIT_API_KEY\` in browser/frontend bundles.
2. ChainKit operations must run strictly server-side.
3. Always validate and sanitize user inputs before passing to SDK methods.
4. Show diffs to the user before writing or modifying integration files.
`;

/**
 * Executes the `init` workflow.
 *
 * @param options - CLI options configuring directory and prompts.
 */
export async function runInit(options: InitOptions = {}): Promise<void> {
  const targetDir = path.resolve(options.cwd ?? process.cwd());

  console.log(chalk.bold.cyan('\n⚙ ChainKit Integration Initializer\n'));

  // 1. Check for package.json
  const packageJsonPath = path.join(targetDir, 'package.json');
  const hasPackageJson = fs.existsSync(packageJsonPath);

  if (!hasPackageJson) {
    console.log(
      chalk.yellow('⚠ Warning: No package.json found in directory:') + ` ${targetDir}`
    );

    if (!options.yes) {
      const { proceedWithoutPkg } = await prompts({
        type: 'confirm',
        name: 'proceedWithoutPkg',
        message: 'Do you want to continue scaffolding anyway?',
        initial: true,
      });

      if (!proceedWithoutPkg) {
        console.log(chalk.red('Initialization cancelled.'));
        return;
      }
    }
  }

  // 2. Ask permission before writing files
  if (!options.yes) {
    const { proceed } = await prompts({
      type: 'confirm',
      name: 'proceed',
      message: `Scaffold ChainKit files into ${chalk.bold(targetDir)}?`,
      initial: true,
    });

    if (!proceed) {
      console.log(chalk.gray('Operation cancelled by user. No files were modified.'));
      return;
    }
  }

  const spinner = ora('Scaffolding ChainKit configuration...').start();
  const modifiedFiles: string[] = [];

  try {
    // 3. Create or update .env.example
    const envExamplePath = path.join(targetDir, '.env.example');
    if (!fs.existsSync(envExamplePath)) {
      fs.writeFileSync(envExamplePath, ENV_EXAMPLE_CONTENT, 'utf8');
      modifiedFiles.push('.env.example (created)');
    } else {
      const existingEnv = fs.readFileSync(envExamplePath, 'utf8');
      if (!existingEnv.includes('CHAINKIT_API_KEY')) {
        fs.appendFileSync(envExamplePath, `\n${ENV_EXAMPLE_CONTENT}`, 'utf8');
        modifiedFiles.push('.env.example (updated with ChainKit variables)');
      } else {
        modifiedFiles.push('.env.example (already contains ChainKit variables)');
      }
    }

    // 4. Create src/chainkit-example.ts
    const srcDir = path.join(targetDir, 'src');
    if (!fs.existsSync(srcDir)) {
      fs.mkdirSync(srcDir, { recursive: true });
    }

    const examplePath = path.join(srcDir, 'chainkit-example.ts');
    fs.writeFileSync(examplePath, EXAMPLE_CODE_TEMPLATE, 'utf8');
    modifiedFiles.push('src/chainkit-example.ts (created)');

    // 5. Create .chainkit/SKILL.md agent skill file
    const skillDir = path.join(targetDir, '.chainkit');
    if (!fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true });
    }
    const skillPath = path.join(skillDir, 'SKILL.md');
    fs.writeFileSync(skillPath, AGENT_SKILL_TEMPLATE, 'utf8');
    modifiedFiles.push('.chainkit/SKILL.md (created)');

    spinner.succeed(chalk.green('ChainKit scaffold generated successfully.'));

    // 6. Handle @chainkit/sdk dependency installation
    let installedSdk = false;
    if (hasPackageJson) {
      const pkgRaw = fs.readFileSync(packageJsonPath, 'utf8');
      const pkgData = JSON.parse(pkgRaw) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };

      const alreadyInstalled =
        Boolean(pkgData.dependencies?.['@chainkit/sdk']) ||
        Boolean(pkgData.devDependencies?.['@chainkit/sdk']);

      if (!alreadyInstalled) {
        let shouldInstall = options.yes || options.install;

        if (!options.yes && options.install === undefined) {
          const { confirmInstall } = await prompts({
            type: 'confirm',
            name: 'confirmInstall',
            message: 'Install @chainkit/sdk now via npm?',
            initial: true,
          });
          shouldInstall = confirmInstall;
        }

        if (shouldInstall) {
          const installSpinner = ora('Installing @chainkit/sdk...').start();
          try {
            execSync('npm install @chainkit/sdk', {
              cwd: targetDir,
              stdio: 'pipe',
            });
            installSpinner.succeed(chalk.green('Installed @chainkit/sdk successfully.'));
            installedSdk = true;
            modifiedFiles.push('package.json (added @chainkit/sdk)');
          } catch {
            installSpinner.warn(
              chalk.yellow('Automatic npm install failed. Please install manually.')
            );
          }
        }
      } else {
        modifiedFiles.push('package.json (@chainkit/sdk already in dependencies)');
      }
    }

    // 7. Show summary of files changed
    console.log(chalk.bold('\nSummary of changes:'));
    for (const file of modifiedFiles) {
      console.log(`  ${chalk.green('✔')} ${file}`);
    }

    console.log(chalk.bold.cyan('\nNext Steps:'));
    console.log(`  1. Copy ${chalk.bold('.env.example')} to ${chalk.bold('.env')}`);
    console.log(`  2. Add your ${chalk.bold('CHAINKIT_API_KEY')} to ${chalk.bold('.env')}`);
    if (!installedSdk) {
      console.log(`  3. Run ${chalk.bold.yellow('npm install @chainkit/sdk')}`);
    }
    console.log(
      `  ${installedSdk ? '3' : '4'}. Run example: ${chalk.bold.yellow('npx tsx src/chainkit-example.ts')}\n`
    );
  } catch (err: unknown) {
    spinner.fail(chalk.red('Failed to initialize ChainKit project.'));
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`Error: ${message}`));
    throw err;
  }
}

/**
 * Register the init command with the Commander program.
 *
 * @param program - Commander program instance.
 */
export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Scaffold a ChainKit integration in the current project')
    .option('-y, --yes', 'Skip prompts and accept default settings')
    .option('--cwd <dir>', 'Specify working directory')
    .action(async (options: InitOptions) => {
      try {
        await runInit(options);
      } catch {
        process.exit(1);
      }
    });
}
