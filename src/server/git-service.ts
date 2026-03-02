import simpleGit, { type SimpleGit } from "simple-git";
import type { GitStatus, FileDiff } from "../lib/types";

export class GitService {
  private git: SimpleGit;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.git = simpleGit(projectPath);
  }

  async isGitRepo(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<GitStatus | null> {
    try {
      const status = await this.git.status();
      const log = await this.git.log({ maxCount: 1 }).catch(() => null);

      let aheadCount = 0;
      let behindCount = 0;
      if (status.tracking) {
        try {
          const ahead = await this.git.raw(["rev-list", "--count", `${status.tracking}..HEAD`]);
          const behind = await this.git.raw(["rev-list", "--count", `HEAD..${status.tracking}`]);
          aheadCount = parseInt(ahead.trim()) || 0;
          behindCount = parseInt(behind.trim()) || 0;
        } catch {}
      }

      return {
        branch: status.current || "detached",
        uncommittedCount: status.files.length,
        aheadCount,
        behindCount,
        lastCommitHash: log?.latest?.hash?.slice(0, 7) || null,
        lastCommitMessage: log?.latest?.message || null,
      };
    } catch {
      return null;
    }
  }

  async getDiffSinceCommit(commitHash: string): Promise<FileDiff[]> {
    try {
      const diff = await this.git.diff([commitHash, "HEAD"]);
      if (!diff.trim()) return [];

      const diffs: FileDiff[] = [];
      const fileSections = diff.split(/^diff --git /m).filter(Boolean);

      for (const section of fileSections) {
        const pathMatch = section.match(/a\/(.+?) b\//);
        if (!pathMatch) continue;

        const hunks = section
          .split("\n")
          .filter((l) => l.startsWith("+") || l.startsWith("-") || l.startsWith("@@"))
          .slice(0, 50)
          .join("\n");

        diffs.push({ path: pathMatch[1], hunks });
      }
      return diffs;
    } catch {
      return [];
    }
  }

  async undoLastCommit(): Promise<{
    success: boolean;
    message: string;
    hash?: string;
    commitMessage?: string;
  }> {
    try {
      const status = await this.git.status();
      if (status.files.length > 0) {
        return { success: false, message: "Uncommitted changes exist. Stash or commit first." };
      }

      const log = await this.git.log({ maxCount: 1 });
      if (!log.latest) {
        return { success: false, message: "No commits to undo." };
      }

      const hash = log.latest.hash.slice(0, 7);
      const msg = log.latest.message;

      await this.git.reset(["--soft", "HEAD~1"]);

      return { success: true, message: `Reverted ${hash}: ${msg}`, hash, commitMessage: msg };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "Git undo failed",
      };
    }
  }

  async getHeadHash(): Promise<string | null> {
    try {
      const hash = await this.git.revparse(["HEAD"]);
      return hash.trim();
    } catch {
      return null;
    }
  }
}
