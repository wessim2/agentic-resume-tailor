/**
 * Strips markdown code block wrappers if present (e.g. ```latex ... ```).
 */
export function cleanLatexOutput(rawOutput: string): string {
  let cleaned = rawOutput.trim();

  // Strip leading code fence block (```latex or ```)
  const codeBlockRegex = /^```(?:latex)?\s*\n([\s\S]*?)\n```$/i;
  const match = cleaned.match(codeBlockRegex);
  if (match && match[1] !== undefined) {
    cleaned = match[1];
  } else {
    // Handle unclosed or partial code fences if any
    if (cleaned.startsWith('```latex')) {
      cleaned = cleaned.replace(/^```latex\s*\n?/i, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*\n?/, '');
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.replace(/\n?```$/, '');
    }
  }

  return cleaned.trim();
}
