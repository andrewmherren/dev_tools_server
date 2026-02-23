import { execa } from 'execa';
import { access } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';
import { logger } from './logger.js';

/**
 * GitManager handles Git operations for repository management
 */
export class GitManager {
    private repoPath: string;

    constructor(repoPath: string) {
        this.repoPath = repoPath;
    }

    /**
     * Initialize a new Git repository
     */
    async init(): Promise<void> {
        try {
            await execa('git', ['init'], { cwd: this.repoPath });

            logger.info('Initialized Git repository', { path: this.repoPath });
        } catch (error) {
            logger.error('Failed to initialize Git repository', {
                path: this.repoPath,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to initialize Git repository: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Clone a repository from a URL
     */
    async clone(url: string, targetPath: string): Promise<void> {
        try {
            await execa('git', ['clone', url, targetPath]);

            logger.info('Cloned Git repository', { url, targetPath });
        } catch (error) {
            logger.error('Failed to clone Git repository', {
                url,
                targetPath,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to clone Git repository: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get the status of the repository
     */
    async status(): Promise<{ clean: boolean; output: string }> {
        try {
            const result = await execa('git', ['status', '--porcelain'], {
                cwd: this.repoPath
            });

            const clean = result.stdout.trim().length === 0;

            logger.debug('Got Git status', { path: this.repoPath, clean });

            return {
                clean,
                output: result.stdout
            };
        } catch (error) {
            logger.error('Failed to get Git status', {
                path: this.repoPath,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to get Git status: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Check if a directory is a Git repository
     */
    async isRepository(): Promise<boolean> {
        try {
            const gitDir = join(this.repoPath, '.git');
            await access(gitDir, constants.F_OK);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get the current branch name
     */
    async getCurrentBranch(): Promise<string> {
        try {
            const result = await execa('git', ['branch', '--show-current'], {
                cwd: this.repoPath
            });

            return result.stdout.trim();
        } catch (error) {
            logger.error('Failed to get current branch', {
                path: this.repoPath,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to get current branch: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * List all branches
     */
    async listBranches(): Promise<string[]> {
        try {
            const result = await execa('git', ['branch', '--list'], {
                cwd: this.repoPath
            });

            const branches = result.stdout
                .split('\n')
                .map(line => line.trim().replace(/^\*\s+/, ''))
                .filter(line => line.length > 0);

            return branches;
        } catch (error) {
            logger.error('Failed to list branches', {
                path: this.repoPath,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to list branches: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Create a new branch
     */
    async createBranch(branchName: string): Promise<void> {
        try {
            await execa('git', ['branch', branchName], { cwd: this.repoPath });

            logger.info('Created Git branch', { path: this.repoPath, branch: branchName });
        } catch (error) {
            logger.error('Failed to create branch', {
                path: this.repoPath,
                branch: branchName,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to create branch: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Switch to a branch
     */
    async checkout(branchName: string): Promise<void> {
        try {
            await execa('git', ['checkout', branchName], { cwd: this.repoPath });

            logger.info('Checked out Git branch', { path: this.repoPath, branch: branchName });
        } catch (error) {
            logger.error('Failed to checkout branch', {
                path: this.repoPath,
                branch: branchName,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to checkout branch: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Add a worktree at the specified path
     */
    async addWorktree(path: string, branch: string): Promise<void> {
        try {
            await execa('git', ['worktree', 'add', path, branch], {
                cwd: this.repoPath
            });

            logger.info('Added Git worktree', {
                repoPath: this.repoPath,
                worktreePath: path,
                branch
            });
        } catch (error) {
            logger.error('Failed to add worktree', {
                repoPath: this.repoPath,
                worktreePath: path,
                branch,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to add worktree: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Remove a worktree
     */
    async removeWorktree(path: string, force = false): Promise<void> {
        try {
            const args = ['worktree', 'remove', path];
            if (force) {
                args.push('--force');
            }

            await execa('git', args, { cwd: this.repoPath });

            logger.info('Removed Git worktree', {
                repoPath: this.repoPath,
                worktreePath: path
            });
        } catch (error) {
            logger.error('Failed to remove worktree', {
                repoPath: this.repoPath,
                worktreePath: path,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to remove worktree: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * List all worktrees
     */
    async listWorktrees(): Promise<Array<{ path: string; branch: string; head: string }>> {
        try {
            const result = await execa('git', ['worktree', 'list', '--porcelain'], {
                cwd: this.repoPath
            });

            const worktrees: Array<{ path: string; branch: string; head: string }> = [];
            const lines = result.stdout.split('\n');

            let current: Partial<{ path: string; branch: string; head: string }> = {};

            for (const line of lines) {
                if (line.startsWith('worktree ')) {
                    current.path = line.substring('worktree '.length);
                } else if (line.startsWith('branch ')) {
                    current.branch = line.substring('branch '.length).replace('refs/heads/', '');
                } else if (line.startsWith('HEAD ')) {
                    current.head = line.substring('HEAD '.length);
                } else if (line === '') {
                    if (current.path) {
                        worktrees.push(current as { path: string; branch: string; head: string });
                    }
                    current = {};
                }
            }

            return worktrees;
        } catch (error) {
            logger.error('Failed to list worktrees', {
                path: this.repoPath,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to list worktrees: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get the remote URL for origin
     */
    async getRemoteUrl(): Promise<string | null> {
        try {
            const result = await execa('git', ['remote', 'get-url', 'origin'], {
                cwd: this.repoPath
            });

            return result.stdout.trim() || null;
        } catch {
            return null;
        }
    }

    /**
     * Validate a Git URL format
     */
    static isValidGitUrl(url: string): boolean {
        // Support HTTPS and SSH URLs
        const httpsPattern = /^https:\/\/[^\s]+\.git$/;
        const sshPattern = /^git@[^\s]+:[^\s]+\.git$/;

        return httpsPattern.test(url) || sshPattern.test(url);
    }

    /**
     * Extract repository name from Git URL
     */
    static getRepoName(url: string): string {
        const match = url.match(/\/([^\/]+)\.git$/);
        return match ? match[1] : '';
    }
}
