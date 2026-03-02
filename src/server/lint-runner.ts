import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import type { LintResult } from "../lib/types";

function detectLintCommand(projectPath: string): string | null {
  const pkgPath = join(projectPath, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(execSync(`cat "${pkgPath}"`, { encoding: "utf8" }));
      if (pkg.scripts?.lint) return "npm run lint -- --no-fix 2>&1 || true";
      if (pkg.scripts?.["lint:check"]) return "npm run lint:check 2>&1 || true";
    } catch {}
  }

  if (existsSync(join(projectPath, ".eslintrc.json")) ||
      existsSync(join(projectPath, ".eslintrc.js")) ||
      existsSync(join(projectPath, "eslint.config.js")) ||
      existsSync(join(projectPath, "eslint.config.mjs"))) {
    return "npx eslint . --no-fix 2>&1 || true";
  }

  return null;
}

export function runLint(projectPath: string, changedFiles: string[]): LintResult[] {
  if (changedFiles.length === 0) return [];

  const cmd = detectLintCommand(projectPath);
  if (!cmd) return [];

  try {
    const output = execSync(cmd, {
      cwd: projectPath,
      encoding: "utf8",
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    });

    if (!output.trim()) return [];

    const results: LintResult[] = [];
    const lines = output.split("\n");
    let currentFile = "";
    const errors: string[] = [];

    for (const line of lines) {
      const fileMatch = line.match(/^([\/\w.\-]+\.\w+)/);
      if (fileMatch && changedFiles.some((f) => line.includes(f))) {
        if (currentFile && errors.length > 0) {
          results.push({ file: currentFile, errors: [...errors], fixed: false });
          errors.length = 0;
        }
        currentFile = fileMatch[1];
      } else if (currentFile && line.trim()) {
        errors.push(line.trim());
      }
    }

    if (currentFile && errors.length > 0) {
      results.push({ file: currentFile, errors, fixed: false });
    }

    return results;
  } catch {
    return [];
  }
}
