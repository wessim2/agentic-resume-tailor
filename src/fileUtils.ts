import fs from 'fs';
import path from 'path';

/**
 * Reads content of a text file from given path.
 */
export function readTextFile(filePath: string): string {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf-8');
}

/**
 * Reads and parses a JSON file from given path with optional runtime schema validation.
 */
export function readJsonFile<T>(
  filePath: string,
  validator?: (data: unknown) => data is T
): T {
  const content = readTextFile(filePath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error: any) {
    throw new Error(`Invalid JSON syntax in ${filePath}: ${error.message}`);
  }

  if (validator && !validator(parsed)) {
    throw new Error(`Invalid JSON schema structure in ${filePath}`);
  }

  return parsed as T;
}

/**
 * Writes content to a text file, creating directory if needed.
 */
export function writeTextFile(filePath: string, content: string): string {
  const absolutePath = path.resolve(filePath);
  const dir = path.dirname(absolutePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(absolutePath, content, 'utf-8');
  return absolutePath;
}

/**
 * Checks whether a file exists at the given path.
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(path.resolve(filePath));
}
