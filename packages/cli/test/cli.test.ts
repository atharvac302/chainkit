/**
 * ChainKit CLI - Unit and Integration Tests
 *
 * Verifies CLI command configuration, doctor diagnostics, and example generation.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runDoctor } from '../src/commands/doctor.js';
import { RECORDS_EXAMPLE_CONTENT, runExample } from '../src/commands/example.js';
import { runInit } from '../src/commands/init.js';
import { createCli } from '../src/index.js';

describe('ChainKit CLI Commands', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chainkit-cli-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  describe('Root CLI Program', () => {
    it('configures the command hierarchy correctly', () => {
      const cli = createCli();
      expect(cli.name()).toBe('chainkit');

      const commands = cli.commands.map((c) => c.name());
      expect(commands).toContain('init');
      expect(commands).toContain('doctor');
      expect(commands).toContain('example');
    });
  });

  describe('Doctor Diagnostics', () => {
    it('diagnoses missing package.json and api key in empty directory', async () => {
      const results = await runDoctor({ cwd: tempDir, silent: true });

      const nodeCheck = results.find((r) => r.title === 'Node.js Runtime Version');
      expect(nodeCheck).toBeDefined();
      expect(nodeCheck?.passed).toBe(true);

      const pkgCheck = results.find((r) => r.title === 'Project package.json');
      expect(pkgCheck).toBeDefined();
      expect(pkgCheck?.passed).toBe(false);

      const apiKeyCheck = results.find((r) => r.title === 'CHAINKIT_API_KEY Configuration');
      expect(apiKeyCheck).toBeDefined();
      expect(apiKeyCheck?.passed).toBe(false);
    });

    it('passes checks when environment and files are valid', async () => {
      // Setup mock package.json
      const pkgJson = {
        name: 'test-app',
        dependencies: {
          '@chainkit/sdk': '^0.1.0',
        },
      };
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(pkgJson, null, 2));

      // Setup mock .env
      fs.writeFileSync(path.join(tempDir, '.env'), 'CHAINKIT_API_KEY=ck_live_real_key_12345\n');

      const results = await runDoctor({ cwd: tempDir, silent: true });

      const pkgCheck = results.find((r) => r.title === 'Project package.json');
      expect(pkgCheck?.passed).toBe(true);

      const apiKeyCheck = results.find((r) => r.title === 'CHAINKIT_API_KEY Configuration');
      expect(apiKeyCheck?.passed).toBe(true);

      const sdkCheck = results.find((r) => r.title === '@chainkit/sdk Dependency');
      expect(sdkCheck?.passed).toBe(true);
    });
  });

  describe('Example Generator', () => {
    it('writes example file to specified output path', async () => {
      const outputPath = path.join(tempDir, 'my-example.ts');
      await runExample('records', { output: outputPath });

      expect(fs.existsSync(outputPath)).toBe(true);
      const content = fs.readFileSync(outputPath, 'utf8');
      expect(content).toContain('ChainKit');
      expect(content).toContain('chainkit.records.create');
      expect(content).toContain('chainkit.records.verify');
    });

    it('prints example code to stdout when print option is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runExample('records', { print: true });

      expect(consoleSpy).toHaveBeenCalledWith(RECORDS_EXAMPLE_CONTENT);
      consoleSpy.mockRestore();
    });
  });

  describe('Init Scaffolding', () => {
    it('creates .env.example, src/chainkit-example.ts, and .chainkit/SKILL.md with --yes', async () => {
      // Create empty package.json
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'my-project' }));

      await runInit({ cwd: tempDir, yes: true, install: false });

      expect(fs.existsSync(path.join(tempDir, '.env.example'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'src', 'chainkit-example.ts'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.chainkit', 'SKILL.md'))).toBe(true);

      const envContent = fs.readFileSync(path.join(tempDir, '.env.example'), 'utf8');
      expect(envContent).toContain('CHAINKIT_API_KEY');
      expect(envContent).toContain('CHAINKIT_BASE_URL');
    });
  });
});
