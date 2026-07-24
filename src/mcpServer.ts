import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { tailorResumePipeline, TailorResumePipelineOptions } from './pipeline.js';

const TAILOR_RESUME_TOOL: Tool = {
  name: 'tailor_resume',
  description:
    'Tailors a base LaTeX resume to a target job description using Gemini API (optionally selecting relevant projects from candidate project vault) and compiles it into a PDF via Docker.',
  inputSchema: {
    type: 'object',
    properties: {
      baseResumePath: {
        type: 'string',
        description: 'Path to the base LaTeX resume file (e.g., sample/resume.tex)',
      },
      jobDescriptionPath: {
        type: 'string',
        description: 'Path to the target job description text file (e.g., sample/job-description.txt)',
      },
      userProfilePath: {
        type: 'string',
        description: 'Path to candidate profile JSON containing project vault & skills (e.g., sample/user-profile.json)',
      },
      outputTexPath: {
        type: 'string',
        description: 'Path where the tailored .tex file will be saved (default: tailored-resume.tex)',
      },
      modelName: {
        type: 'string',
        description: 'Gemini model to use (default: gemini-2.5-flash)',
      },
      skipPdfCompilation: {
        type: 'boolean',
        description: 'If true, skips the Docker PDF compilation step',
      },
    },
    required: ['baseResumePath', 'jobDescriptionPath'],
  },
};

/**
 * Validates raw MCP tool arguments safely at runtime without resorting to 'as any'.
 */
function validateToolArgs(args: unknown): TailorResumePipelineOptions {
  if (typeof args !== 'object' || args === null) {
    throw new Error('Tool arguments must be a non-null object.');
  }

  const record = args as Record<string, unknown>;

  if (typeof record.baseResumePath !== 'string' || !record.baseResumePath.trim()) {
    throw new Error('Argument "baseResumePath" must be a non-empty string.');
  }

  if (typeof record.jobDescriptionPath !== 'string' || !record.jobDescriptionPath.trim()) {
    throw new Error('Argument "jobDescriptionPath" must be a non-empty string.');
  }

  return {
    baseResumePath: record.baseResumePath,
    jobDescriptionPath: record.jobDescriptionPath,
    userProfilePath: typeof record.userProfilePath === 'string' ? record.userProfilePath : undefined,
    userProfile: typeof record.userProfile === 'object' && record.userProfile !== null ? (record.userProfile as any) : undefined,
    outputTexPath: typeof record.outputTexPath === 'string' ? record.outputTexPath : undefined,
    modelName: typeof record.modelName === 'string' ? record.modelName : undefined,
    skipPdfCompilation: typeof record.skipPdfCompilation === 'boolean' ? record.skipPdfCompilation : undefined,
  };
}

async function runMcpServer() {
  const server = new Server(
    {
      name: 'automated-resume-mcp-server',
      version: '1.2.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [TAILOR_RESUME_TOOL],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: rawArgs } = request.params;

    if (name === 'tailor_resume') {
      try {
        const validatedOptions = validateToolArgs(rawArgs);

        const result = await tailorResumePipeline(validatedOptions);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error tailoring resume: ${err.message || String(err)}`,
            },
          ],
        };
      }
    }

    throw new Error(`Tool not found: ${name}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runMcpServer().catch((err) => {
  console.error('MCP Server Error:', err);
  process.exit(1);
});
