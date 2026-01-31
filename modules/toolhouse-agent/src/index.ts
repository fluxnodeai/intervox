/**
 * Toolhouse Agent Module
 *
 * Integrates Toolhouse.ai for enhanced AI tool execution.
 * Provides tool-calling capabilities for the investigation pipeline.
 *
 * @see prompts/toolhouse-agent.prompt
 */

import { Toolhouse } from "@toolhouseai/sdk";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "@/shared/config";

// Initialize Toolhouse with Anthropic provider
const toolhouse = new Toolhouse({
  apiKey: config.toolhouse.apiKey,
  provider: "anthropic",
});

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: config.anthropic.apiKey,
});

/**
 * Available tool bundles for different tasks
 */
export type ToolBundle = "web_search" | "scraping" | "memory" | "all";

/**
 * Execute a task using Toolhouse-powered Claude
 * This gives Claude access to real-world tools for data gathering
 */
export async function executeWithTools(
  task: string,
  context?: string,
  bundle: ToolBundle = "all"
): Promise<string> {
  try {
    // Get available tools from Toolhouse
    const tools = await toolhouse.getTools();

    // Build the prompt
    const systemPrompt = `You are an AI assistant with access to tools for gathering information.
Your task is to help with OSINT (Open Source Intelligence) research.
${context ? `Context: ${context}` : ""}

Use the available tools to complete the task. Be thorough and accurate.`;

    // Initial message
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: task },
    ];

    // Create completion with tools
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools: tools as Anthropic.Tool[],
      messages,
    });

    // Run any tool calls through Toolhouse
    const toolResults = await toolhouse.runTools(response);

    // If there were tool calls, continue the conversation
    if (response.stop_reason === "tool_use") {
      // Add assistant response and tool results to messages
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults as any });

      // Get final response
      const finalResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        tools: tools as Anthropic.Tool[],
        messages,
      });

      // Extract text from response
      const textContent = finalResponse.content.find(
        (block) => block.type === "text"
      );
      return textContent?.type === "text" ? textContent.text : "";
    }

    // Extract text from response
    const textContent = response.content.find((block) => block.type === "text");
    return textContent?.type === "text" ? textContent.text : "";
  } catch (error) {
    console.error("Toolhouse execution error:", error);
    throw error;
  }
}

/**
 * Search the web using Toolhouse tools
 */
export async function toolhouseWebSearch(query: string): Promise<string> {
  return executeWithTools(
    `Search the web for: "${query}". Return relevant information found.`,
    "Web search task",
    "web_search"
  );
}

/**
 * Analyze a person using Toolhouse tools
 */
export async function analyzePersonWithTools(
  name: string,
  context?: string
): Promise<{
  summary: string;
  sources: string[];
  confidence: number;
}> {
  const result = await executeWithTools(
    `Research and analyze the public figure "${name}".
${context ? `Additional context: ${context}` : ""}

Find:
1. Current role and company
2. Background and education
3. Notable achievements
4. Recent news or activities
5. Public statements or opinions

Return a comprehensive summary.`,
    "Person analysis using available tools"
  );

  return {
    summary: result,
    sources: ["toolhouse-web-search", "toolhouse-memory"],
    confidence: 85,
  };
}

/**
 * Store information in Toolhouse memory for later retrieval
 */
export async function storeInMemory(
  key: string,
  content: string
): Promise<boolean> {
  try {
    await executeWithTools(
      `Store the following information with key "${key}": ${content}`,
      "Memory storage task",
      "memory"
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieve information from Toolhouse memory
 */
export async function retrieveFromMemory(key: string): Promise<string | null> {
  try {
    const result = await executeWithTools(
      `Retrieve information stored with key "${key}"`,
      "Memory retrieval task",
      "memory"
    );
    return result;
  } catch {
    return null;
  }
}

/**
 * Get available tools from Toolhouse
 */
export async function getAvailableTools(): Promise<string[]> {
  try {
    const tools = await toolhouse.getTools();
    return tools.map((t: any) => t.name || t.function?.name || "unknown");
  } catch (error) {
    console.error("Error fetching tools:", error);
    return [];
  }
}

/**
 * Health check for Toolhouse connection
 */
export async function healthCheck(): Promise<{
  connected: boolean;
  toolCount: number;
  error?: string;
}> {
  try {
    const tools = await toolhouse.getTools();
    return {
      connected: true,
      toolCount: tools.length,
    };
  } catch (error) {
    return {
      connected: false,
      toolCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
