# 🎓 Agent Development Kit (ADK) & Agentic Architecture Learning Guide

Welcome to your comprehensive learning guide on **Agentic Architecture** and **Agent Development Kit (ADK)** patterns! 

This document explains the design principles, architecture, and step-by-step implementation of the multi-agent system we built for the Automated Resume Pipeline.

---

## 💡 1. What is an AI Agent vs a Standard LLM Call?

### Standard Single-Prompt LLM Call
In a basic AI application, you send a single prompt (e.g. *"Tailor this resume"*) to the model and return whatever text it generates. 

**Limitations:**
* If the output contains syntax errors, the pipeline fails permanently.
* The LLM tries to do too many tasks at once (matching experience, parsing formatting, escaping characters, drafting bullet points).
* High risk of hallucination or context overflow.

### Agentic ADK Architecture
An **AI Agent** is an autonomous entity designed with:
1. **A Single Specialized Responsibility (Persona):** Focuses on one specific domain task.
2. **Tool Access:** Executes real-world actions (e.g., file reading/writing, running Docker commands).
3. **Structured Communication:** Passes state clean JSON/data models to downstream agents.
4. **Feedback & Self-Correction Loops:** Intercepts failures, diagnoses the root cause from error logs, and automatically repairs mistakes.

---

## 🏗️ 2. The 3-Stage Multi-Agent Architecture

Our pipeline divides the resume tailoring process into three specialized agents coordinated by a **Multi-Agent Orchestrator**:

```
                       ┌───────────────────────────────┐
                       │  Target Job Description +     │
                       │  Candidate Project Vault JSON │
                       └───────────────┬───────────────┘
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ 🔍 STAGE 1: Vault Selection Agent (src/agents/vaultAgent.ts)               │
 │ • Analyzes job requirements vs candidate vault.                           │
 │ • Ranks projects and outputs structured JSON selection.                   │
 └─────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ ✍️ STAGE 2: LaTeX Writer Agent (src/agents/latexWriterAgent.ts)            │
 │ • Synthesizes base resume with curated vault selections.                 │
 │ • Enforces strict raw LaTeX output without markdown fences.              │
 └─────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ 🚀 STAGE 3: Compiler Auto-Repair Agent (src/agents/compilerAgent.ts)      │
 │ • Triggers Docker pdflatex compilation.                                   │
 │ • If SUCCESS -> Returns PDF path.                                         │
 │ • If FAIL    -> Extracts compiler error log -> LLM Self-Healing Repair ->  │
 │                 Retries compilation (Feedback Loop up to N attempts).     │
 └───────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 3. Code Walkthrough & Pattern Analysis

### Stage 1: The Vault Selection Agent (`src/agents/vaultAgent.ts`)
* **Role:** Ranks and filters projects from `user-profile.json` against `job-description.txt`.
* **ADK Pattern:** **Structured JSON Output (`responseMimeType: 'application/json'`)**.
* **Why:** By forcing the model to respond in JSON, downstream agents receive clean, typed data (`VaultAgentResult`) instead of unstructured natural language text.

---

### Stage 2: The LaTeX Writer Agent (`src/agents/latexWriterAgent.ts`)
* **Role:** Synthesizes LaTeX markup.
* **ADK Pattern:** **Specialized System Instruction + Output Sanitization**.
* **Why:** The system prompt explicitly enforces strict constraints (escaping `%`, `$`, `&`, `#`), while `cleanLatexOutput()` acts as a defensive guard to strip any accidental Markdown fences (` ```latex `).

---

### Stage 3: The Self-Healing Compiler Agent (`src/agents/compilerAgent.ts`)
* **Role:** Compiles LaTeX into PDF using Docker and auto-repairs compilation errors.
* **ADK Pattern:** **The Feedback & Self-Correction Loop**.

#### How the Feedback Loop Works:
1. **Execute:** Runs `compileLatexToPdf()` inside Docker.
2. **Evaluate:** Checks if the output `.pdf` file was generated.
3. **Intercept Error Log:** If compilation fails, extracts the trailing 1,500 characters of `pdflatex` compilation logs (which highlight unescaped characters or missing braces).
4. **Prompt Self-Healing:** Feeds both the broken `.tex` source and the exact compiler error log back to Gemini with `REPAIR_AGENT_SYSTEM_PROMPT`.
5. **Retry:** Writes the repaired `.tex` code and retries compilation (up to `maxRetries = 3`).

---

## 🎯 4. Best Practices for Mastering ADK & Agentic Coding

1. **Keep Agent Tasks Single-Purpose:**
   Don't ask one prompt to evaluate projects, format layout, and debug code simultaneously. Split tasks into dedicated agents.

2. **Always Implement Defensive Fallbacks:**
   If JSON parsing fails or an LLM returns unexpected formatting, handle the error gracefully so your system doesn't crash.

3. **Provide High-Signal Context in Failure Logs:**
   When sending errors back to an AI agent for self-repair, include **only the relevant error snippet**, not raw 50,000-line logs. High signal-to-noise ratio yields faster, more accurate repairs.

4. **Expose Pipelines via Open Protocols (MCP):**
   Architecting your agent as a modular function and exposing it over **Model Context Protocol (MCP)** ensures any external agent (Antigravity, Claude, Cursor) can trigger your workflow seamlessly.

---

## 🎓 Summary Checklist for Students

* [x] **Agent Separation:** Distinct agents for Vault Selection, Writing, and Compilation Repair.
* [x] **State Orchestration:** Clean TypeScript state passing across pipeline stages.
* [x] **Self-Healing Loop:** Automatic Docker error recovery feedback loop.
* [x] **Agentic Extensibility:** Fully exposed over stdio via MCP (`src/mcpServer.ts`).
