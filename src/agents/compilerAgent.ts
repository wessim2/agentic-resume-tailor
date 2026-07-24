import { GoogleGenAI } from '@google/genai';
import { compileLatexToPdf, CompileResult } from '../compiler.js';
import { writeTextFile } from '../fileUtils.js';
import { cleanLatexOutput } from '../utils/latexCleaner.js';

export interface CompilerAgentOptions {
  texFilePath: string;
  latexContent: string;
  apiKey: string;
  modelName?: string;
  dockerImage?: string;
  maxRetries?: number;
  aiClient?: GoogleGenAI;
}

export interface CompilerAgentResult {
  success: boolean;
  pdfPath?: string;
  finalTexContent: string;
  attempts: number;
  repairLogs: string[];
}

const REPAIR_AGENT_SYSTEM_PROMPT = `
You are an expert LaTeX Compiler Repair Specialist Agent.
A LaTeX document failed to compile into a PDF due to a compilation syntax error.
Your job is to inspect the broken LaTeX source code and the exact LaTeX compiler error log, diagnose the root cause, and output a corrected, fully compilable raw LaTeX document.

RULES:
1. Fix all unescaped special characters (e.g. %, $, &, _, #), missing braces, unclosed environments (e.g., \\begin{itemize} without \\end{itemize}), or invalid packages.
2. Output ONLY the repaired raw LaTeX code.
3. DO NOT include any conversational explanations or Markdown formatting fences.
`.trim();

/**
 * Compiler & Auto-Repair Agent: Manages Docker LaTeX compilation and executes a self-healing feedback loop on error.
 */
export async function runCompilerAgent(options: CompilerAgentOptions): Promise<CompilerAgentResult> {
  const {
    texFilePath,
    latexContent: initialLatexContent,
    apiKey,
    modelName = 'gemini-2.5-flash',
    dockerImage,
    maxRetries = 3,
    aiClient,
  } = options;

  let currentLatex = initialLatexContent;
  let currentTexPath = writeTextFile(texFilePath, currentLatex);
  const repairLogs: string[] = [];

  const ai = aiClient || new GoogleGenAI({ apiKey });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.error(` ⚙️ [Compiler Agent] Compilation attempt ${attempt}/${maxRetries}...`);

    const compileResult: CompileResult = await compileLatexToPdf({
      texFilePath: currentTexPath,
      dockerImage,
    });

    if (compileResult.success) {
      console.error(` ✨ [Compiler Agent] Compilation succeeded on attempt ${attempt}!`);
      return {
        success: true,
        pdfPath: compileResult.pdfPath,
        finalTexContent: currentLatex,
        attempts: attempt,
        repairLogs,
      };
    }

    const errorLog = `${compileResult.stdout}\n${compileResult.stderr}`;
    const logSnippet = errorLog.slice(-1500);
    const logEntry = `Attempt ${attempt} failed:\n${logSnippet}`;
    repairLogs.push(logEntry);

    console.error(` ⚠️ [Compiler Agent] Attempt ${attempt} failed. Triggering Auto-Repair Agent...`);

    if (attempt === maxRetries) {
      break;
    }

    // Trigger LLM Self-Healing Repair Step
    const repairPrompt = `
=== BROKEN LATEX SOURCE ===
${currentLatex}

=== COMPILER ERROR LOG ===
${logSnippet}

=== INSTRUCTION ===
Diagnose the compilation failure from the log above and output the fully repaired raw LaTeX code.
`.trim();

    try {
      const repairResponse = await ai.models.generateContent({
        model: modelName,
        contents: repairPrompt,
        config: {
          systemInstruction: REPAIR_AGENT_SYSTEM_PROMPT,
          temperature: 0.1,
        },
      });

      const repairedRaw = repairResponse.text || '';
      if (repairedRaw) {
        currentLatex = cleanLatexOutput(repairedRaw);
        currentTexPath = writeTextFile(texFilePath, currentLatex);
      } else {
        console.error(` ⚠️ [Compiler Agent] Repair agent returned an empty response for attempt ${attempt}.`);
      }
    } catch (repairErr: any) {
      console.error(` ⚠️ [Compiler Agent] Repair step failed on attempt ${attempt}:`, repairErr.message || repairErr);
    }
  }

  return {
    success: false,
    finalTexContent: currentLatex,
    attempts: maxRetries,
    repairLogs,
  };
}
