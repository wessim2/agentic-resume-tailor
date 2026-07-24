import { GoogleGenAI } from '@google/genai';
import { UserProfile } from '../types/profile.js';
import { runVaultAgent, VaultAgentResult } from './vaultAgent.js';
import { runLatexWriterAgent } from './latexWriterAgent.js';
import { runCompilerAgent, CompilerAgentResult } from './compilerAgent.js';
import { writeTextFile } from '../fileUtils.js';

export interface OrchestratorOptions {
  baseResumeTex: string;
  jobDescriptionText: string;
  userProfile?: UserProfile;
  outputTexPath: string;
  apiKey: string;
  modelName?: string;
  dockerImage?: string;
  skipPdfCompilation?: boolean;
}

export interface OrchestratorResult {
  success: boolean;
  tailoredTexPath: string;
  tailoredPdfPath?: string;
  vaultSelection?: VaultAgentResult;
  attempts: number;
  repairLogs: string[];
  error?: string;
}

/**
 * Multi-Agent Orchestrator: Coordinates Vault Selection Agent, Writer Agent, and Compiler Auto-Repair Agent.
 */
export async function runAgenticOrchestrator(
  options: OrchestratorOptions
): Promise<OrchestratorResult> {
  const {
    baseResumeTex,
    jobDescriptionText,
    userProfile,
    outputTexPath,
    apiKey,
    modelName = 'gemini-2.5-flash',
    dockerImage,
    skipPdfCompilation = false,
  } = options;

  // Single shared GoogleGenAI client instance for performance and resource reuse
  const aiClient = new GoogleGenAI({ apiKey });

  // STAGE 1: Vault Selection Agent
  let vaultSelection: VaultAgentResult | undefined;
  if (userProfile && userProfile.projectVault?.length > 0) {
    console.error(' 🔍 [Agent 1: Vault Agent] Ranking candidate project vault against job description...');
    vaultSelection = await runVaultAgent(userProfile, jobDescriptionText, apiKey, modelName, aiClient);
    console.error(` 💡 [Agent 1: Vault Agent] Selected ${vaultSelection.selectedProjects.length} projects.`);
  }

  // STAGE 2: LaTeX Writer Agent
  console.error(' ✍️ [Agent 2: Writer Agent] Synthesizing tailored LaTeX document...');
  const latexCode = await runLatexWriterAgent({
    baseResumeTex,
    jobDescriptionText,
    vaultSelection,
    apiKey,
    modelName,
    aiClient,
  });

  const absoluteTexPath = writeTextFile(outputTexPath, latexCode);

  if (skipPdfCompilation) {
    return {
      success: true,
      tailoredTexPath: absoluteTexPath,
      vaultSelection,
      attempts: 1,
      repairLogs: [],
    };
  }

  // STAGE 3: Compiler & Auto-Repair Agent Loop
  console.error(' 🚀 [Agent 3: Compiler Agent] Initiating Docker build & feedback loop...');
  const compilerResult: CompilerAgentResult = await runCompilerAgent({
    texFilePath: absoluteTexPath,
    latexContent: latexCode,
    apiKey,
    modelName,
    dockerImage,
    maxRetries: 3,
    aiClient,
  });

  if (!compilerResult.success) {
    return {
      success: false,
      tailoredTexPath: absoluteTexPath,
      vaultSelection,
      attempts: compilerResult.attempts,
      repairLogs: compilerResult.repairLogs,
      error: 'Compiler Agent reached max retries without successful PDF generation.',
    };
  }

  return {
    success: true,
    tailoredTexPath: absoluteTexPath,
    tailoredPdfPath: compilerResult.pdfPath,
    vaultSelection,
    attempts: compilerResult.attempts,
    repairLogs: compilerResult.repairLogs,
  };
}
