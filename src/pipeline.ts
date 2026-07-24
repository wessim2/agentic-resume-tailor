import path from 'path';
import { getConfig } from './config.js';
import { readTextFile, readJsonFile, fileExists } from './fileUtils.js';
import { runAgenticOrchestrator, OrchestratorResult } from './agents/orchestrator.js';
import { UserProfile } from './types/profile.js';

export interface TailorResumePipelineOptions {
  baseResumePath: string;
  jobDescriptionPath: string;
  userProfilePath?: string;
  userProfile?: UserProfile;
  outputTexPath?: string;
  apiKey?: string;
  modelName?: string;
  dockerImage?: string;
  skipPdfCompilation?: boolean;
}

export interface TailorResumePipelineResult {
  success: boolean;
  tailoredTexPath: string;
  tailoredPdfPath?: string;
  attempts: number;
  repairLogs: string[];
  compilationLog?: string;
  error?: string;
}

/**
 * Core modular pipeline function powered by multi-agent ADK architecture.
 */
export async function tailorResumePipeline(
  options: TailorResumePipelineOptions
): Promise<TailorResumePipelineResult> {
  const {
    baseResumePath,
    jobDescriptionPath,
    userProfilePath,
    userProfile: directUserProfile,
    outputTexPath = 'tailored-resume.tex',
    apiKey: customApiKey,
    modelName: customModelName,
    dockerImage,
    skipPdfCompilation = false,
  } = options;

  const config = getConfig(customApiKey);
  const apiKey = customApiKey || config.geminiApiKey;
  const modelName = customModelName || config.geminiModel;

  if (!apiKey) {
    throw new Error(
      'Missing Gemini API Key. Provide apiKey parameter or set GEMINI_API_KEY environment variable.'
    );
  }

  // 1. Read input files
  const baseResumeTex = readTextFile(baseResumePath);
  const jobDescriptionText = readTextFile(jobDescriptionPath);

  // Load user profile / project vault if specified
  let userProfile: UserProfile | undefined = directUserProfile;
  if (!userProfile && userProfilePath) {
    if (fileExists(userProfilePath)) {
      userProfile = readJsonFile<UserProfile>(userProfilePath);
    } else {
      throw new Error(`User profile file not found at: ${userProfilePath}`);
    }
  }

  // 2. Delegate to Multi-Agent Orchestrator
  const orchestratorResult: OrchestratorResult = await runAgenticOrchestrator({
    baseResumeTex,
    jobDescriptionText,
    userProfile,
    outputTexPath,
    apiKey,
    modelName,
    dockerImage,
    skipPdfCompilation,
  });

  return {
    success: orchestratorResult.success,
    tailoredTexPath: orchestratorResult.tailoredTexPath,
    tailoredPdfPath: orchestratorResult.tailoredPdfPath,
    attempts: orchestratorResult.attempts,
    repairLogs: orchestratorResult.repairLogs,
    compilationLog: orchestratorResult.repairLogs.join('\n\n'),
    error: orchestratorResult.error,
  };
}
