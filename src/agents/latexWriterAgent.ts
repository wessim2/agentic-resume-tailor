import { GoogleGenAI } from '@google/genai';
import { VaultAgentResult } from './vaultAgent.js';
import { cleanLatexOutput } from '../utils/latexCleaner.js';

const LATEX_WRITER_SYSTEM_PROMPT = `
You are an expert LaTeX Resume Writer and Document Architect Agent.
Your task is to synthesize a tailored LaTeX resume that STRICTLY follows the visual template, layout, packages, preamble, and formatting of the provided BASE LATEX RESUME.

STRICT CONSTRAINTS & TEMPLATE RULES:
1. TEMPLATE FIDELITY: You MUST use the exact preamble, documentclass, packages, margin setups, custom commands, fonts, and styling rules defined in the BASE LATEX RESUME.
2. SECTION HIERARCHY: Maintain the exact section headings (e.g. \\section*{...}) and structural ordering of the base resume template.
3. CONTENT SUBSTITUTION: Update the professional summary, experience bullet points, skills list, and project entries using the relevant data from the TARGET JOB DESCRIPTION and CURATED PROJECTS FROM VAULT.
4. VALID LATEX OUTPUT ONLY: Output ONLY compilable, raw LaTeX code. DO NOT wrap the output in Markdown fences (e.g., do NOT use \`\`\`latex or \`\`\`).
5. NO CONVERSATIONAL TEXT: Do not include any greetings, notes, comments, or explanations.
6. CHARACTER ESCAPING: Ensure all LaTeX special characters (such as %, $, &, _, #) in new text are properly escaped (e.g., \\%, \\$, \\&, \\_, \\#).
7. Output must start directly with \\documentclass and end with \\end{document}.
`.trim();

export interface WriterAgentOptions {
  baseResumeTex: string;
  jobDescriptionText: string;
  vaultSelection?: VaultAgentResult;
  apiKey: string;
  modelName?: string;
  aiClient?: GoogleGenAI;
}

/**
 * LaTeX Writer Agent: Synthesizes tailored LaTeX code while strictly preserving the base LaTeX resume template.
 */
export async function runLatexWriterAgent(options: WriterAgentOptions): Promise<string> {
  const {
    baseResumeTex,
    jobDescriptionText,
    vaultSelection,
    apiKey,
    modelName = 'gemini-2.5-flash',
    aiClient,
  } = options;

  const ai = aiClient || new GoogleGenAI({ apiKey });

  const vaultContext = vaultSelection
    ? `
=== CURATED PROJECTS & SKILLS FROM VAULT ===
Reasoning: ${vaultSelection.reasoning}
Highlight Skills: ${vaultSelection.highlightSkills.join(', ')}
Selected Projects:
${JSON.stringify(vaultSelection.selectedProjects, null, 2)}
`
    : '';

  const promptContent = `
=== TARGET JOB DESCRIPTION ===
${jobDescriptionText}
${vaultContext}
=== BASE LATEX RESUME TEMPLATE ===
${baseResumeTex}

=== INSTRUCTION ===
Synthesize the tailored LaTeX resume. Strictly preserve the preamble, packages, layout, and visual formatting of the BASE LATEX RESUME TEMPLATE above.
Output ONLY raw, valid LaTeX code starting with \\documentclass and ending with \\end{document}.
`.trim();

  const response = await ai.models.generateContent({
    model: modelName,
    contents: promptContent,
    config: {
      systemInstruction: LATEX_WRITER_SYSTEM_PROMPT,
      temperature: 0.15,
    },
  });

  const rawText = response.text || '';
  if (!rawText) {
    throw new Error('LaTeX Writer Agent returned an empty response.');
  }

  return cleanLatexOutput(rawText);
}
