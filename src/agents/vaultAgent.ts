import { GoogleGenAI } from '@google/genai';
import { UserProfile, ProjectVaultItem } from '../types/profile.js';

export interface VaultAgentResult {
  selectedProjects: ProjectVaultItem[];
  highlightSkills: string[];
  reasoning: string;
}

const VAULT_AGENT_PROMPT = `
You are an expert AI Career Matcher and Talent Analytics Agent.
Your task is to analyze a candidate's Master Project Vault and select the MOST RELEVANT projects and skills for a target job description.

RULES:
1. Rank all projects in the vault by relevance to the job requirements.
2. Select the top 2 to 3 most impactful projects that match key job keywords and technologies.
3. Identify top 5-10 technical skills from the master profile to emphasize.
4. Output your analysis as valid JSON in the exact format:
{
  "selectedProjectIds": ["proj-1", "proj-2"],
  "highlightSkills": ["TypeScript", "Docker"],
  "reasoning": "Selected proj-1 because..."
}
`.trim();

/**
 * Vault Agent: Ranks and selects the best candidate projects for a target job description.
 */
export async function runVaultAgent(
  userProfile: UserProfile,
  jobDescriptionText: string,
  apiKey: string,
  modelName: string = 'gemini-2.5-flash',
  aiClient?: GoogleGenAI
): Promise<VaultAgentResult> {
  const ai = aiClient || new GoogleGenAI({ apiKey });

  const promptContent = `
=== TARGET JOB DESCRIPTION ===
${jobDescriptionText}

=== MASTER PROJECT VAULT ===
${JSON.stringify(userProfile, null, 2)}
`.trim();

  const response = await ai.models.generateContent({
    model: modelName,
    contents: promptContent,
    config: {
      systemInstruction: VAULT_AGENT_PROMPT,
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  });

  const rawText = response.text || '{}';
  try {
    const parsed = JSON.parse(rawText);
    const selectedIds: string[] = parsed.selectedProjectIds || [];

    const selectedProjects = userProfile.projectVault.filter((p) =>
      selectedIds.includes(p.id)
    );

    // Fallback if none matched explicitly
    const finalProjects =
      selectedProjects.length > 0 ? selectedProjects : userProfile.projectVault.slice(0, 3);

    return {
      selectedProjects: finalProjects,
      highlightSkills: parsed.highlightSkills || [],
      reasoning: parsed.reasoning || 'Selected best matching projects from vault.',
    };
  } catch (e) {
    // Graceful fallback to top 3 projects
    return {
      selectedProjects: userProfile.projectVault.slice(0, 3),
      highlightSkills: [],
      reasoning: 'Fallback selection due to parsing response.',
    };
  }
}
