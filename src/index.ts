import { tailorResumePipeline } from './pipeline.js';
import { fileExists } from './fileUtils.js';

async function main() {
  const args = process.argv.slice(2);

  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  const hasFlag = (flag: string): boolean => args.includes(flag);

  const baseResumePath = getArg('--resume') || getArg('-r') || 'sample/resume.tex';
  const jobDescriptionPath = getArg('--job') || getArg('-j') || 'sample/job-description.txt';
  const outputTexPath = getArg('--output') || getArg('-o') || 'tailored-resume.tex';

  let userProfilePath = getArg('--profile') || getArg('-p');
  if (!userProfilePath && fileExists('sample/user-profile.json')) {
    userProfilePath = 'sample/user-profile.json';
  }

  const apiKey = getArg('--key') || process.env.GEMINI_API_KEY;
  const modelName = getArg('--model') || process.env.GEMINI_MODEL;
  const skipPdfCompilation = hasFlag('--skip-pdf');

  console.log('----------------------------------------------------');
  console.log('   Automated Resume Tailoring & Compilation Pipeline');
  console.log('----------------------------------------------------');
  console.log(`Base Resume:     ${baseResumePath}`);
  console.log(`Job Description: ${jobDescriptionPath}`);
  if (userProfilePath) console.log(`Project Vault:   ${userProfilePath}`);
  console.log(`Output LaTeX:    ${outputTexPath}`);
  if (modelName) console.log(`Model:           ${modelName}`);
  console.log('----------------------------------------------------');

  try {
    console.log('⏳ Tailoring resume with Gemini API...');
    const result = await tailorResumePipeline({
      baseResumePath,
      jobDescriptionPath,
      userProfilePath,
      outputTexPath,
      apiKey,
      modelName,
      skipPdfCompilation,
    });

    if (result.success) {
      console.log(' ✅ Resume successfully tailored!');
      console.log(` 📄 LaTeX output written to: ${result.tailoredTexPath}`);
      if (result.tailoredPdfPath) {
        console.log(` 📕 PDF successfully compiled at: ${result.tailoredPdfPath}`);
      } else if (skipPdfCompilation) {
        console.log(' ℹ️ PDF compilation skipped as requested (--skip-pdf).');
      }
    } else {
      console.error(' ❌ Pipeline failed during PDF compilation:');
      console.error(result.error);
      if (result.compilationLog) {
        console.error('Compilation Log Snippet:');
        console.error(result.compilationLog.slice(-1000));
      }
      process.exit(1);
    }
  } catch (err: any) {
    console.error(' ❌ Pipeline Error:', err.message || err);
    process.exit(1);
  }
}

main();
