import { existsSync, statSync } from "fs";
import { resolve } from "path";

export function resolveProjectPath(inputPath: string): string {
  const resolved = resolve(inputPath);

  if (!existsSync(resolved)) {
    throw new Error(`Path does not exist: ${resolved}`);
  }

  if (!statSync(resolved).isDirectory()) {
    throw new Error(`Path is not a directory: ${resolved}`);
  }

  return resolved;
}
