// Unit tests for GitManager

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('execa');
vi.mock('fs/promises');

import { execa } from 'execa';
import { access } from 'fs/promises';
import { GitManager } from '../../../src/services/git-manager.js';

describe('GitManager', () => {
    let gitManager: GitManager;
    const testPath = '/test/repo';

    beforeEach(() => {
        vi.clearAllMocks();
        gitManager = new GitManager(testPath);
    });

    describe('init', () => {
        it('should initialize a new git repository', async () => {
            vi.mocked(execa).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 } as any);

            await gitManager.init();

            expect(execa).toHaveBeenCalledWith('git', ['init'], { cwd: testPath });
        });

        it('should throw error when init fails', async () => {
            vi.mocked(execa).mockRejectedValue(new Error('Git not found'));

            await expect(gitManager.init()).rejects.toThrow('Failed to initialize Git repository');
        });
    });

    describe('clone', () => {
        it('should clone a repository', async () => {
            const url = 'https://github.com/user/repo.git';
            const targetPath = '/test/target';

            vi.mocked(execa).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 } as any);

            await gitManager.clone(url, targetPath);

            expect(execa).toHaveBeenCalledWith('git', ['clone', url, targetPath]);
        });

        it('should throw error when clone fails', async () => {
            vi.mocked(execa).mockRejectedValue(new Error('Network error'));

            await expect(gitManager.clone('https://github.com/user/repo.git', '/test/target'))
                .rejects.toThrow('Failed to clone Git repository');
        });
    });

    describe('status', () => {
        it('should return clean status when no changes', async () => {
            vi.mocked(execa).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 } as any);

            const result = await gitManager.status();

            expect(result.clean).toBe(true);
            expect(result.output).toBe('');
            expect(execa).toHaveBeenCalledWith('git', ['status', '--porcelain'], { cwd: testPath });
        });

        it('should return dirty status when changes exist', async () => {
            vi.mocked(execa).mockResolvedValue({
                stdout: ' M file1.txt\n?? file2.txt',
                stderr: '',
                exitCode: 0
            } as any);

            const result = await gitManager.status();

            expect(result.clean).toBe(false);
            expect(result.output).toContain('file1.txt');
        });

        it('should throw error when status fails', async () => {
            vi.mocked(execa).mockRejectedValue(new Error('Not a git repository'));

            await expect(gitManager.status()).rejects.toThrow('Failed to get Git status');
        });
    });

    describe('isRepository', () => {
        it('should return true when .git directory exists', async () => {
            vi.mocked(access).mockResolvedValue(undefined);

            const result = await gitManager.isRepository();

            expect(result).toBe(true);
        });

        it('should return false when .git directory does not exist', async () => {
            vi.mocked(access).mockRejectedValue(new Error('ENOENT'));

            const result = await gitManager.isRepository();

            expect(result).toBe(false);
        });
    });

    describe('getCurrentBranch', () => {
        it('should return current branch name', async () => {
            vi.mocked(execa).mockResolvedValue({ stdout: 'main\n', stderr: '', exitCode: 0 } as any);

            const branch = await gitManager.getCurrentBranch();

            expect(branch).toBe('main');
            expect(execa).toHaveBeenCalledWith('git', ['branch', '--show-current'], { cwd: testPath });
        });

        it('should throw error when getting branch fails', async () => {
            vi.mocked(execa).mockRejectedValue(new Error('Not a git repository'));

            await expect(gitManager.getCurrentBranch()).rejects.toThrow('Failed to get current branch');
        });
    });

    describe('listBranches', () => {
        it('should return list of branches', async () => {
            vi.mocked(execa).mockResolvedValue({
                stdout: '* main\n  develop\n  feature-branch',
                stderr: '',
                exitCode: 0
            } as any);

            const branches = await gitManager.listBranches();

            expect(branches).toEqual(['main', 'develop', 'feature-branch']);
        });

        it('should handle empty branch list', async () => {
            vi.mocked(execa).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 } as any);

            const branches = await gitManager.listBranches();

            expect(branches).toEqual([]);
        });

        it('should throw error when listing fails', async () => {
            vi.mocked(execa).mockRejectedValue(new Error('Not a git repository'));

            await expect(gitManager.listBranches()).rejects.toThrow('Failed to list branches');
        });
    });

    describe('createBranch', () => {
        it('should create a new branch', async () => {
            vi.mocked(execa).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 } as any);

            await gitManager.createBranch('new-feature');

            expect(execa).toHaveBeenCalledWith('git', ['branch', 'new-feature'], { cwd: testPath });
        });

        it('should throw error when branch creation fails', async () => {
            vi.mocked(execa).mockRejectedValue(new Error('Branch already exists'));

            await expect(gitManager.createBranch('existing')).rejects.toThrow('Failed to create branch');
        });
    });

    describe('checkout', () => {
        it('should checkout a branch', async () => {
            vi.mocked(execa).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 } as any);

            await gitManager.checkout('develop');

            expect(execa).toHaveBeenCalledWith('git', ['checkout', 'develop'], { cwd: testPath });
        });

        it('should throw error when checkout fails', async () => {
            vi.mocked(execa).mockRejectedValue(new Error('Branch not found'));

            await expect(gitManager.checkout('nonexistent')).rejects.toThrow('Failed to checkout branch');
        });
    });

    describe('addWorktree', () => {
        it('should add a worktree', async () => {
            vi.mocked(execa).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 } as any);

            await gitManager.addWorktree('/test/worktree', 'feature-branch');

            expect(execa).toHaveBeenCalledWith(
                'git',
                ['worktree', 'add', '/test/worktree', 'feature-branch'],
                { cwd: testPath }
            );
        });

        it('should throw error when adding worktree fails', async () => {
            vi.mocked(execa).mockRejectedValue(new Error('Worktree already exists'));

            await expect(gitManager.addWorktree('/test/worktree', 'branch'))
                .rejects.toThrow('Failed to add worktree');
        });
    });

    describe('removeWorktree', () => {
        it('should remove a worktree', async () => {
            vi.mocked(execa).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 } as any);

            await gitManager.removeWorktree('/test/worktree');

            expect(execa).toHaveBeenCalledWith(
                'git',
                ['worktree', 'remove', '/test/worktree'],
                { cwd: testPath }
            );
        });

        it('should force remove a worktree when specified', async () => {
            vi.mocked(execa).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 } as any);

            await gitManager.removeWorktree('/test/worktree', true);

            expect(execa).toHaveBeenCalledWith(
                'git',
                ['worktree', 'remove', '/test/worktree', '--force'],
                { cwd: testPath }
            );
        });

        it('should throw error when removing worktree fails', async () => {
            vi.mocked(execa).mockRejectedValue(new Error('Worktree not found'));

            await expect(gitManager.removeWorktree('/test/worktree'))
                .rejects.toThrow('Failed to remove worktree');
        });
    });
});
