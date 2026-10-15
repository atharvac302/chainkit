/**
 * ChainKit CLI - Doctor Command
 *
 * Diagnoses the local environment, runtime versions, required files,
 * dependencies, and environment configurations for running ChainKit.
 *
 * @module @chainkit/cli/commands/doctor
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import type { Command } from 'commander';
import ora from 'ora';

/**
 * Result of an individual diagnostic check.
 */
export interface DiagnosticResult {
  title: string;
  passed: boolean;
  warning?: boolean;
  details: string;
  recommendation?: string;
}

/**
 * Options for running the doctor command.
 */
export interface DoctorOptions {
  cwd?: string;
  silent?: boolean;
}

/**
 * Parses simple KEY=VALUE pairs from a .env file content.
 */
function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
  }

  return result;
}

/**
 * Executes system and project health checks for ChainKit.
 *
 * @param options - Configuration options for the doctor check.
 * @returns Array of diagnostic results.
 */
export async function runDoctor(options: DoctorOptions = {}): Promise<DiagnosticResult[]> {
  const targetDir = path.resolve(options.cwd ?? process.cwd());
  const results: DiagnosticResult[] = [];

  if (!options.silent) {
    console.log(chalk.bold.cyan('\n🩺 ChainKit Doctor — Environment Diagnostics\n'));
    console.log(chalk.gray(`Target directory: ${targetDir}\n`));
  }

  const spinner = options.silent ? null : ora('Running diagnostic checks...').start();

  // 1. Check Node.js Version >= 20
  const nodeVersionStr = process.versions.node;
  const majorVersion = parseInt(nodeVersionStr.split('.')[0] ?? '0', 10);
  const nodePassed = majorVersion >= 20;

  results.push({
    title: 'Node.js Runtime Version',
    passed: nodePassed,
    details: `v${nodeVersionStr} (Required: >= 20.0.0)`,
    recommendation: nodePassed
      ? undefined
      : 'Please upgrade to Node.js 20 LTS or higher for native fetch and modern ESM support.',
  });

  // 2. Check package.json existence
  const packageJsonPath = path.join(targetDir, 'package.json');
  const packageExists = fs.existsSync(packageJsonPath);

  let packageData: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  } = {};

  if (packageExists) {
    try {
      const content = fs.readFileSync(packageJsonPath, 'utf8');
      packageData = JSON.parse(content) as typeof packageData;
      results.push({
        title: 'Project package.json',
        passed: true,
        details: 'Found valid package.json',
      });
    } catch {
      results.push({
        title: 'Project package.json',
        passed: false,
        details: 'Found package.json, but it contains invalid JSON syntax.',
        recommendation: 'Fix the syntax error in your package.json file.',
      });
    }
  } else {
    results.push({
      title: 'Project package.json',
      passed: false,
      details: 'No package.json found in the target directory.',
      recommendation: 'Run "npm init -y" or "chainkit init" to configure this project.',
    });
  }

  // 3. Check for CHAINKIT_API_KEY in process.env or .env file
  let apiKeySource = '';
  let foundApiKey: string | undefined = process.env.CHAINKIT_API_KEY;

  if (foundApiKey) {
    apiKeySource = 'process.env';
  } else {
    const envPath = path.join(targetDir, '.env');
    if (fs.existsSync(envPath)) {
      try {
        const parsed = parseEnvContent(fs.readFileSync(envPath, 'utf8'));
        if (parsed['CHAINKIT_API_KEY']) {
          foundApiKey = parsed['CHAINKIT_API_KEY'];
          apiKeySource = '.env file';
        }
      } catch {
        // Ignored, checked below
      }
    }
  }

  const isPlaceholderKey =
    foundApiKey === 'your_api_key_here' ||
    foundApiKey === 'ck_test_replace_with_your_api_key' ||
    foundApiKey === '';

  if (foundApiKey && !isPlaceholderKey) {
    results.push({
      title: 'CHAINKIT_API_KEY Configuration',
      passed: true,
      details: `Configured via ${apiKeySource} (Length: ${foundApiKey.length} characters)`,
    });
  } else if (foundApiKey && isPlaceholderKey) {
    results.push({
      title: 'CHAINKIT_API_KEY Configuration',
      passed: false,
      warning: true,
      details: `Found in ${apiKeySource}, but value is still the placeholder template.`,
      recommendation: 'Replace the placeholder in .env with your real API key from ChainKit dashboard.',
    });
  } else {
    results.push({
      title: 'CHAINKIT_API_KEY Configuration',
      passed: false,
      details: 'Not found in process environment or local .env file.',
      recommendation: 'Create a .env file with CHAINKIT_API_KEY=<your_api_key>.',
    });
  }

  // 4. Check if @chainkit/sdk is installed
  const hasSdkInDeps =
    Boolean(packageData.dependencies?.['@chainkit/sdk']) ||
    Boolean(packageData.devDependencies?.['@chainkit/sdk']);

  const nodeModulesSdkPath = path.join(targetDir, 'node_modules', '@chainkit', 'sdk');
  const hasSdkInNodeModules = fs.existsSync(nodeModulesSdkPath);

  const sdkPassed = hasSdkInDeps || hasSdkInNodeModules;

  results.push({
    title: '@chainkit/sdk Dependency',
    passed: sdkPassed,
    details: sdkPassed
      ? hasSdkInNodeModules
        ? 'Installed and available in node_modules'
        : 'Declared in package.json dependencies'
      : 'Not installed or declared in project dependencies.',
    recommendation: sdkPassed
      ? undefined
      : 'Install the SDK package by running: npm install @chainkit/sdk',
  });

  if (spinner) {
    spinner.stop();
  }

  // Output formatted diagnostic report
  if (!options.silent) {
    let failureCount = 0;
    let warningCount = 0;

    for (const check of results) {
      if (check.passed) {
        console.log(`  ${chalk.green('✔')} ${chalk.bold(check.title)}: ${chalk.gray(check.details)}`);
      } else if (check.warning) {
        warningCount++;
        console.log(`  ${chalk.yellow('⚠')} ${chalk.bold(check.title)}: ${chalk.yellow(check.details)}`);
        if (check.recommendation) {
          console.log(`    ${chalk.cyan('Suggestion:')} ${check.recommendation}`);
        }
      } else {
        failureCount++;
        console.log(`  ${chalk.red('✖')} ${chalk.bold(check.title)}: ${chalk.red(check.details)}`);
        if (check.recommendation) {
          console.log(`    ${chalk.cyan('Suggestion:')} ${check.recommendation}`);
        }
      }
    }

    console.log();
    if (failureCount === 0 && warningCount === 0) {
      console.log(chalk.bold.green('All diagnostics passed! Your environment is ready for ChainKit.\n'));
    } else if (failureCount === 0) {
      console.log(
        chalk.bold.yellow(`Diagnostics passed with ${warningCount} warning(s). Check recommendations above.\n`)
      );
    } else {
      console.log(
        chalk.bold.red(`Diagnostics found ${failureCount} critical issue(s). Resolve them to use ChainKit.\n`)
      );
    }
  }

  return results;
}

/**
 * Register the doctor command with the Commander program.
 *
 * @param program - Commander program instance.
 */
export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Check Node version, package.json, environment variables, and SDK dependencies')
    .option('--cwd <dir>', 'Specify working directory to diagnose')
    .action(async (options: DoctorOptions) => {
      const results = await runDoctor(options);
      const hasCriticalFailures = results.some((r) => !r.passed && !r.warning);
      if (hasCriticalFailures) {
        process.exit(1);
      }
    });
}
