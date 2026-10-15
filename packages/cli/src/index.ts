#!/usr/bin/env node

/**
 * ChainKit CLI - Command Line Tool
 *
 * Developer tooling for scaffolding, inspecting, diagnosing, and automating
 * integrations with the ChainKit Blockchain-as-a-Service platform.
 *
 * @module @chainkit/cli
 */

import { Command } from 'commander';
import { registerDoctorCommand } from './commands/doctor.js';
import { registerExampleCommand } from './commands/example.js';
import { registerInitCommand } from './commands/init.js';

/**
 * Instantiate and configure the root Commander program.
 */
export function createCli(): Command {
  const program = new Command();

  program
    .name('chainkit')
    .description('ChainKit CLI — Developer tooling for Blockchain-as-a-Service')
    .version('0.1.0', '-v, --version', 'Output the current version of the ChainKit CLI');

  // Register commands
  registerInitCommand(program);
  registerDoctorCommand(program);
  registerExampleCommand(program);

  return program;
}

/**
 * Main execution handler.
 */
export async function run(): Promise<void> {
  const program = createCli();

  try {
    await program.parseAsync(process.argv);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`CLI execution error: ${message}`);
    process.exit(1);
  }
}

// Invoke when executed directly as CLI binary
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  run();
}
