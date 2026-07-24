import { describe, it, expect } from 'vitest';
import { cleanLatexOutput } from '../utils/latexCleaner.js';
import { formatDockerVolumePath, compileLatexToPdf } from '../compiler.js';
import { readJsonFile, readTextFile } from '../fileUtils.js';

describe('cleanLatexOutput', () => {
  it('should return raw LaTeX when no markdown code blocks are present', () => {
    const raw = '\\documentclass{article}\n\\begin{document}\nHello World\n\\end{document}';
    expect(cleanLatexOutput(raw)).toBe(raw);
  });

  it('should strip leading and trailing ```latex fence blocks', () => {
    const raw = '```latex\n\\documentclass{article}\n\\begin{document}\nHello World\n\\end{document}\n```';
    const expected = '\\documentclass{article}\n\\begin{document}\nHello World\n\\end{document}';
    expect(cleanLatexOutput(raw)).toBe(expected);
  });

  it('should strip simple ``` fence blocks', () => {
    const raw = '```\n\\documentclass{article}\n\\end{document}\n```';
    const expected = '\\documentclass{article}\n\\end{document}';
    expect(cleanLatexOutput(raw)).toBe(expected);
  });
});

describe('formatDockerVolumePath', () => {
  it('should standardize backslashes to forward slashes for Docker', () => {
    const winPath = 'D:\\projects\\2026\\automated-resume';
    const formatted = formatDockerVolumePath(winPath);
    expect(formatted).not.toContain('\\');
    expect(formatted).toContain('/');
  });
});

describe('compileLatexToPdf input sanitization', () => {
  it('should reject malicious filenames containing command injection attempts', async () => {
    await expect(
      compileLatexToPdf({ texFilePath: 'sample/test; rm -rf /.tex' })
    ).rejects.toThrow(/Invalid LaTeX filename/);
  });
});

describe('fileUtils', () => {
  it('should correctly read text files', () => {
    const content = readTextFile('sample/job-description.txt');
    expect(content).toContain('The Flex');
  });

  it('should parse valid JSON files', () => {
    const profile = readJsonFile<any>('sample/user-profile.json');
    expect(profile).toHaveProperty('candidate');
    expect(profile).toHaveProperty('projectVault');
  });

  it('should throw error when validator fails', () => {
    const validator = (data: unknown): data is { candidate: { name: string } } => {
      return typeof data === 'object' && data !== null && 'invalidProp' in data;
    };

    expect(() =>
      readJsonFile('sample/user-profile.json', validator)
    ).toThrow(/Invalid JSON schema structure/);
  });
});
