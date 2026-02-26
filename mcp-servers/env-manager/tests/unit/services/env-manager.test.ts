import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { EnvManager } from '../../../src/services/env-manager.js';

describe('EnvManager', () => {
    let tempDir: string;
    let envPath: string;
    let manager: EnvManager;

    beforeEach(async () => {
        tempDir = await mkdtemp(join(tmpdir(), 'env-manager-'));
        envPath = join(tempDir, '.env');
        manager = new EnvManager(envPath);
    });

    afterEach(async () => {
        await rm(tempDir, { recursive: true, force: true });
    });

    it('returns empty object when file is missing', async () => {
        const env = await manager.read();
        expect(env).toEqual({});
    });

    it('reads and parses env content', async () => {
        await writeFile(
            envPath,
            [
                '# comment',
                'FOO=bar',
                'QUOTED="with spaces"',
                'INVALID_LINE',
                'BLANK=',
                ''
            ].join('\n'),
            'utf-8'
        );

        const env = await manager.read();
        expect(env).toEqual({
            FOO: 'bar',
            QUOTED: 'with spaces',
            BLANK: ''
        });
    });

    it('writes sorted keys and quotes when needed', async () => {
        await manager.write({
            ZED: 'last',
            ALPHA: 'one',
            SPACE: 'two words'
        });

        const content = await readFile(envPath, 'utf-8');
        const lines = content.split('\n');

        expect(lines[0]).toBe('# Environment variables');
        expect(lines[1].startsWith('# Generated: ')).toBe(true);

        const body = lines.slice(3).filter((line) => line.length > 0);
        expect(body).toEqual(['ALPHA=one', 'SPACE="two words"', 'ZED=last']);
    });

    it('sets, gets, checks, and deletes values', async () => {
        await manager.set('FOO', 'bar');

        expect(await manager.get('FOO')).toBe('bar');
        expect(await manager.has('FOO')).toBe(true);

        const removed = await manager.delete('FOO');
        expect(removed).toBe(true);
        expect(await manager.has('FOO')).toBe(false);

        const missing = await manager.delete('MISSING');
        expect(missing).toBe(false);
    });

    it('merges new values into existing ones', async () => {
        await manager.write({
            ONE: '1',
            TWO: '2'
        });

        await manager.merge({
            TWO: 'updated',
            THREE: '3'
        });

        const env = await manager.read();
        expect(env).toEqual({
            ONE: '1',
            TWO: 'updated',
            THREE: '3'
        });
    });

    it('backs up and restores files', async () => {
        await manager.write({
            KEEP: 'original'
        });

        const backupPath = await manager.backup();
        expect(backupPath).not.toBe('');
        expect(existsSync(backupPath)).toBe(true);

        await manager.write({
            KEEP: 'changed'
        });

        await manager.restore(backupPath);
        const env = await manager.read();
        expect(env).toEqual({ KEEP: 'original' });
    });
});
