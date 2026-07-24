import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CompileOptions {
  texFilePath: string;
  useCompose?: boolean;
  dockerImage?: string;
  timeoutMs?: number;
}

export interface CompileResult {
  success: boolean;
  pdfPath?: string;
  stdout: string;
  stderr: string;
}

/**
 * Formats host file system directory path for Docker -v volume mounting across Windows and POSIX.
 */
export function formatDockerVolumePath(hostPath: string): string {
  const absolutePath = path.resolve(hostPath);
  return absolutePath.replace(/\\/g, '/');
}

/**
 * Compiles a LaTeX file into a PDF using Docker Compose or standalone Docker image.
 * Includes strict input sanitization to prevent command injection.
 */
export async function compileLatexToPdf(options: CompileOptions): Promise<CompileResult> {
  const {
    texFilePath,
    useCompose = fs.existsSync(path.resolve('docker-compose.yml')),
    dockerImage = 'resume-latex-compiler:latest',
    timeoutMs = 180000,
  } = options;

  const absoluteTexPath = path.resolve(texFilePath);
  const workDir = path.dirname(absoluteTexPath);
  const texFileName = path.basename(absoluteTexPath);

  // Security Sanitization: Prevent command injection via malicious filenames
  if (!/^[\w\-\.]+\.tex$/i.test(texFileName)) {
    throw new Error(
      `Invalid LaTeX filename "${texFileName}". Filenames must only contain letters, numbers, hyphens, and underscores.`
    );
  }

  if (!fs.existsSync(absoluteTexPath)) {
    throw new Error(`LaTeX file not found at: ${absoluteTexPath}`);
  }

  const pdfFileName = texFileName.replace(/\.tex$/i, '.pdf');
  const expectedPdfPath = path.join(workDir, pdfFileName);
  const formattedWorkDir = formatDockerVolumePath(workDir);

  let dockerCommand: string;

  if (useCompose) {
    // Relative directory inside container /workdir
    const relWorkDir = path.relative(process.cwd(), workDir).replace(/\\/g, '/');
    const containerWorkDir = relWorkDir && relWorkDir !== '.' ? `/workdir/${relWorkDir}` : '/workdir';

    dockerCommand = `docker compose run --rm -w "${containerWorkDir}" latex-compiler "${texFileName}"`;
  } else {
    // Standalone Docker container workflow with quoted path arguments
    dockerCommand = `docker run --rm -v "${formattedWorkDir}":/workdir -w /workdir "${dockerImage}" pdflatex -interaction=nonstopmode "${texFileName}"`;
  }

  try {
    const { stdout, stderr } = await execAsync(dockerCommand, {
      timeout: timeoutMs,
    });

    const success = fs.existsSync(expectedPdfPath);

    return {
      success,
      pdfPath: success ? expectedPdfPath : undefined,
      stdout,
      stderr,
    };
  } catch (error: any) {
    const stdout = error.stdout || '';
    const stderr = error.stderr || error.message || '';
    const success = fs.existsSync(expectedPdfPath);

    return {
      success,
      pdfPath: success ? expectedPdfPath : undefined,
      stdout,
      stderr,
    };
  }
}
