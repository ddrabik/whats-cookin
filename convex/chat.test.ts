import { describe, expect, test } from "vitest";
import { convertToOpenAIMessage, parseToolArguments } from "./chat";

describe("convertToOpenAIMessage", () => {
  test("converts user message", () => {
    const msg = { role: "user" as const, content: "Hello", toolCalls: undefined, toolCallId: undefined };
    const result = convertToOpenAIMessage(msg);
    expect(result).toEqual({ role: "user", content: "Hello" });
  });

  test("converts assistant message with content", () => {
    const msg = { role: "assistant" as const, content: "Hi there", toolCalls: undefined, toolCallId: undefined };
    const result = convertToOpenAIMessage(msg);
    expect(result).toEqual({ role: "assistant", content: "Hi there" });
  });

  test("converts assistant message with toolCalls", () => {
    const msg = {
      role: "assistant" as const,
      content: "",
      toolCalls: [{ id: "call_1", name: "search_recipes", arguments: '{"query":"pasta"}' }],
      toolCallId: undefined,
    };
    const result = convertToOpenAIMessage(msg);
    expect(result).toEqual({
      role: "assistant",
      content: "",
      tool_calls: [{
        id: "call_1",
        type: "function",
        function: { name: "search_recipes", arguments: '{"query":"pasta"}' },
      }],
    });
  });

  test("converts tool result message", () => {
    const msg = { role: "tool" as const, content: "Found 3 recipes", toolCalls: undefined, toolCallId: "call_1" };
    const result = convertToOpenAIMessage(msg);
    expect(result).toEqual({ role: "tool", content: "Found 3 recipes", tool_call_id: "call_1" });
  });

  test("handles empty content on assistant tool-call messages", () => {
    const msg = {
      role: "assistant" as const,
      content: "",
      toolCalls: [{ id: "call_1", name: "get_recipe", arguments: '{"id":"abc123"}' }],
      toolCallId: undefined,
    };
    const result = convertToOpenAIMessage(msg);
    expect(result.role).toBe("assistant");
    expect(result.content).toBe("");
  });
});

describe("parseToolArguments", () => {
  test("parses valid JSON string", () => {
    expect(parseToolArguments('{"query":"pasta"}')).toEqual({ query: "pasta" });
  });

  test("throws on malformed JSON", () => {
    expect(() => parseToolArguments("{invalid}")).toThrow();
  });

  test("handles empty object", () => {
    expect(parseToolArguments("{}")).toEqual({});
  });
});
