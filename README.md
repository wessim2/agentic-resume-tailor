# Automated Resume Tailoring & Compilation Pipeline

A modular Node.js & TypeScript pipeline that uses the **Gemini API** to automatically tailor LaTeX resumes to target job descriptions, and compiles the tailored result into a PDF using a Dockerized LaTeX environment (`texlive/texlive`).

## Features

- **File I/O Module**: Reads base LaTeX resume templates (`.tex`) and target job description text files (`.txt`).
- **LLM Integration (Gemini API)**: System prompt enforcing a Technical Recruiter persona to output strict, raw LaTeX code without Markdown fence wrappers or conversational filler.
- **Docker Compilation**: Triggers Docker execution of `pdflatex` (`texlive/texlive`) via Node `child_process.exec` to produce compiled `.pdf` output.
- **Agentic Extensibility (MCP Server)**: Exposes the core pipeline as a Model Context Protocol (MCP) server so AI agents (like Claude Desktop, Antigravity, etc.) can invoke `tailor_resume` directly via stdio.

---

## Directory Structure

```
.
├── .env.example            # Environment template
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript configuration
├── sample/
│   ├── resume.tex          # Sample LaTeX resume template
│   └── job-description.txt # Sample target job description
├── src/
│   ├── config.ts           # Environment variable loader
│   ├── fileUtils.ts        # File reading/writing utilities
│   ├── llm.ts              # Gemini API SDK integration & output cleaner
│   ├── compiler.ts         # Docker pdflatex compilation runner
│   ├── pipeline.ts         # Core modular pipeline function tailorResumePipeline()
│   ├── index.ts            # Local CLI runner
│   └── mcpServer.ts        # Model Context Protocol (MCP) server integration
└── README.md
```

---

## Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (v22+ recommended)
- **Docker & Docker Compose**: Installed and running.
- **Gemini API Key**: Obtain from [Google AI Studio](https://aistudio.google.com/).

### 2. Build Docker Container (Optional / Recommended)
Build the local lightweight LaTeX compilation container using Docker Compose:
```bash
npm run docker:build
# or: docker compose build
```

### 3. Installation
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file from `.env.example`:
```bash
GEMINI_API_KEY=your_actual_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

---

## Usage

### Option A: Local CLI Runner
Run the pipeline using default sample files (`sample/resume.tex`, `sample/job-description.txt`, and `sample/user-profile.json`):
```bash
npm start
```

Custom CLI Options:
```bash
npx tsx src/index.ts --resume my_resume.tex --job target_job.txt --profile my_vault.json --output tailored-resume.tex --key YOUR_API_KEY
```

Options:
- `--resume`, `-r`: Path to input `.tex` resume (Default: `sample/resume.tex`)
- `--job`, `-j`: Path to target job description `.txt` (Default: `sample/job-description.txt`)
- `--profile`, `-p`: Path to candidate profile & project vault `.json` (Default: `sample/user-profile.json`)
- `--output`, `-o`: Output `.tex` path (Default: `tailored-resume.tex`)
- `--model`: Gemini model name (Default: `gemini-2.5-flash`)
- `--skip-pdf`: Skip Docker PDF compilation step

---

### Candidate Project Vault (`user-profile.json`)
Candidates can store all their projects, skills, and experiences in a JSON vault (`user-profile.json`). When tailoring a resume, the LLM selects the **most relevant projects** from the vault for the specific job description and replaces or enhances LaTeX resume sections dynamically.

---

### Option B: Modular Programmatic Import
Import `tailorResumePipeline` directly into any TypeScript/Node.js project or agent framework:

```typescript
import { tailorResumePipeline } from './src/pipeline.js';

const result = await tailorResumePipeline({
  baseResumePath: 'sample/resume.tex',
  jobDescriptionPath: 'sample/job-description.txt',
  outputTexPath: 'tailored-resume.tex',
  apiKey: process.env.GEMINI_API_KEY,
  modelName: 'gemini-2.5-flash',
});

console.log('PDF Generated at:', result.tailoredPdfPath);
```

---

### Option C: Expose as MCP Server (Model Context Protocol)

To run as an MCP server over stdio for external AI agents:
```bash
npm run mcp
```

#### MCP Client Configuration Example (e.g. `mcpServers` in configuration file):
```json
{
  "mcpServers": {
    "resume-tailor": {
      "command": "node",
      "args": ["/path/to/automated-resume/dist/mcpServer.js"],
      "env": {
        "GEMINI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

---

## Build

Compile TypeScript source code to `/dist`:
```bash
npm run build
```
