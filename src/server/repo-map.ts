import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, extname } from "path";
import type { RepoMapEntry } from "../lib/types";

const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java",
  ".c", ".cpp", ".h", ".cs", ".rb", ".php", ".swift", ".kt",
  ".vue", ".svelte", ".astro",
]);

const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out",
  "__pycache__", ".venv", "venv", "vendor", ".turbo", "coverage",
]);

const SYMBOL_PATTERNS: Record<string, RegExp[]> = {
  ts: [
    /^export\s+(?:async\s+)?(?:function|const|class|interface|type|enum)\s+(\w+)/,
    /^(?:async\s+)?(?:function|const|class|interface|type|enum)\s+(\w+)/,
  ],
  py: [
    /^(?:def|class|async\s+def)\s+(\w+)/,
  ],
  go: [
    /^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)/,
    /^type\s+(\w+)\s+(?:struct|interface)/,
  ],
};

function extractSymbols(content: string, ext: string): string[] {
  const patterns = SYMBOL_PATTERNS[ext === ".tsx" || ext === ".jsx" ? "ts" : ext.slice(1)] || SYMBOL_PATTERNS.ts;
  const symbols: string[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    for (const pat of patterns) {
      const match = line.match(pat);
      if (match?.[1]) {
        symbols.push(match[1]);
        break;
      }
    }
  }
  return symbols;
}

function walkDir(dir: string, base: string, maxFiles: number): Array<{ path: string; fullPath: string }> {
  const results: Array<{ path: string; fullPath: string }> = [];

  function walk(current: string) {
    if (results.length >= maxFiles) return;

    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= maxFiles) return;

      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name) && !entry.name.startsWith(".")) {
          walk(join(current, entry.name));
        }
      } else if (CODE_EXTENSIONS.has(extname(entry.name))) {
        const fullPath = join(current, entry.name);
        results.push({ path: relative(base, fullPath), fullPath });
      }
    }
  }

  walk(dir);
  return results;
}

export function buildRepoMap(
  projectPath: string,
  contextFiles: Set<string>,
  maxFiles = 500
): RepoMapEntry[] {
  const files = walkDir(projectPath, projectPath, maxFiles);
  const entries: RepoMapEntry[] = [];

  for (const { path, fullPath } of files) {
    try {
      const stat = statSync(fullPath);
      if (stat.size > 512 * 1024) continue;

      const content = readFileSync(fullPath, "utf8");
      const lineCount = content.split("\n").length;
      const symbols = extractSymbols(content, extname(fullPath));

      entries.push({
        path,
        symbols: symbols.slice(0, 20),
        lineCount,
        inContext: contextFiles.has(path),
      });
    } catch {
      continue;
    }
  }

  return entries;
}
