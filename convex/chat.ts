"use node";

import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

// ---- Types for DB messages ----
interface DbMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
  toolCallId?: string;
}

// ---- Pure functions (exported for testing) ----

export function convertToOpenAIMessage(msg: DbMessage): ChatCompletionMessageParam {
  if (msg.role === "user") {
    return { role: "user", content: msg.content };
  }
  if (msg.role === "tool") {
    return { role: "tool", content: msg.content, tool_call_id: msg.toolCallId! };
  }
  // assistant
  if (msg.toolCalls && msg.toolCalls.length > 0) {
    return {
      role: "assistant",
      content: msg.content,
      tool_calls: msg.toolCalls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.name, arguments: tc.arguments },
      })),
    };
  }
  return { role: "assistant", content: msg.content };
}

export function parseToolArguments(argsStr: string): Record<string, unknown> {
  return JSON.parse(argsStr) as Record<string, unknown>;
}

// ---- System prompt ----
const SYSTEM_PROMPT = `You are a friendly meal planning assistant called "What's Cookin'". You help users plan meals, find recipes, and explore their cookbook.

You have access to the user's recipe collection. Use your tools to search and browse recipes when the user asks about meals, ingredients, or meal planning.

When presenting recipes, format them nicely in markdown. When suggesting meal plans, organize them by day/meal.

Always be helpful, concise, and enthusiastic about cooking!`;

// ---- Tool definitions ----
const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_recipes",
      description: "Search the user's recipe collection by keyword. Searches recipe titles, ingredients, and meal types.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query to find recipes" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_recipes",
      description: "List recipes from the user's collection, optionally filtered by meal type.",
      parameters: {
        type: "object",
        properties: {
          mealType: {
            type: "string",
            enum: ["breakfast", "lunch", "dinner", "snack", "dessert"],
            description: "Filter by meal type",
          },
          limit: { type: "number", description: "Maximum number of recipes to return" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recipe",
      description: "Get full details of a specific recipe by its ID.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "The recipe ID" },
        },
        required: ["id"],
      },
    },
  },
];

// ---- Main action ----
export const respond = internalAction({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    // 1. Load message history
    const messages = await ctx.runQuery(internal.messages.listInternal, {
      threadId: args.threadId,
    });

    // 2. Convert to OpenAI format
    const openaiMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) =>
        convertToOpenAIMessage({
          role: m.role,
          content: m.content,
          toolCalls: m.toolCalls,
          toolCallId: m.toolCallId,
        })
      ),
    ];

    // 3. Initialize OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 4. Call OpenAI in a loop (handles tool calls)
    let continueLoop = true;
    while (continueLoop) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: openaiMessages,
        tools,
      });

      const choice = completion.choices[0];
      const responseMessage = choice.message;

      const functionCalls = responseMessage.tool_calls?.filter(
        (tc): tc is Extract<typeof tc, { type: "function" }> =>
          tc.type === "function"
      );

      if (functionCalls && functionCalls.length > 0) {
        // Save assistant message with tool calls
        const toolCallsForDb = functionCalls.map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments,
        }));

        await ctx.runMutation(internal.messages.saveAssistant, {
          threadId: args.threadId,
          content: responseMessage.content ?? "",
          toolCalls: toolCallsForDb,
        });

        // Add assistant message to conversation
        openaiMessages.push({
          role: "assistant",
          content: responseMessage.content ?? "",
          tool_calls: functionCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.function.name, arguments: tc.function.arguments },
          })),
        });

        // Execute each tool call
        for (const toolCall of functionCalls) {
          let result: string;
          try {
            const toolArgs = parseToolArguments(toolCall.function.arguments);
            result = await executeTool(ctx, toolCall.function.name, toolArgs);
          } catch (error) {
            result = JSON.stringify({
              error: `Failed to execute tool: ${error instanceof Error ? error.message : "Unknown error"}`,
            });
          }

          // Save tool result to DB
          await ctx.runMutation(internal.messages.saveTool, {
            threadId: args.threadId,
            content: result,
            toolCallId: toolCall.id,
          });

          // Add tool result to conversation
          openaiMessages.push({
            role: "tool",
            content: result,
            tool_call_id: toolCall.id,
          });
        }
        // Continue the loop to get the final response
      } else {
        // Plain text response — save and exit
        await ctx.runMutation(internal.messages.saveAssistant, {
          threadId: args.threadId,
          content: responseMessage.content ?? "",
        });
        continueLoop = false;
      }
    }

    // 5. Touch the thread to update timestamp
    await ctx.runMutation(internal.threads.touch, {
      threadId: args.threadId,
    });
  },
});

// ---- Tool execution ----
async function executeTool(
  ctx: any,
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "search_recipes": {
      const results = await ctx.runQuery(internal.recipes.searchInternal, {
        query: (args.query as string) ?? "",
      });
      return JSON.stringify(results);
    }
    case "list_recipes": {
      const results = await ctx.runQuery(internal.recipes.listInternal, {
        mealType: args.mealType as string | undefined,
        limit: args.limit as number | undefined,
      });
      return JSON.stringify(results);
    }
    case "get_recipe": {
      const result = await ctx.runQuery(internal.recipes.getInternal, {
        id: args.id as string,
      });
      return JSON.stringify(result ?? { error: "Recipe not found" });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
