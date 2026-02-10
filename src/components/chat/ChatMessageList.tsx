import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

interface Message {
  _id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
  toolCallId?: string;
}

interface ChatMessageListProps {
  messages: Message[];
  isWaiting: boolean;
}

export function ChatMessageList({ messages, isWaiting }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isWaiting]);

  // Build a map of tool call ID to tool result for pairing
  const toolResults = new Map<string, Message>();
  for (const msg of messages) {
    if (msg.role === "tool" && msg.toolCallId) {
      toolResults.set(msg.toolCallId, msg);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-[750px] mx-auto w-full space-y-4">
      {messages
        .filter((m) => m.role !== "tool")
        .map((message) => (
          <div key={message._id}>
            {/* Message bubble */}
            <div
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                    <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>

            {/* Tool call visibility */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <div className="flex justify-start mt-2 ml-2">
                <div className="space-y-2 max-w-[80%]">
                  {message.toolCalls.map((tc) => {
                    const result = toolResults.get(tc.id);
                    let argsSummary = "";
                    try {
                      const parsed = JSON.parse(tc.arguments);
                      argsSummary = Object.values(parsed).join(", ");
                    } catch {
                      argsSummary = tc.arguments;
                    }

                    let resultSummary = "";
                    if (result) {
                      try {
                        const parsed = JSON.parse(result.content);
                        if (Array.isArray(parsed)) {
                          resultSummary = `Found ${parsed.length} recipe${parsed.length !== 1 ? "s" : ""}`;
                        } else if (parsed.error) {
                          resultSummary = parsed.error;
                        } else if (parsed.title) {
                          resultSummary = parsed.title;
                        } else {
                          resultSummary = "Done";
                        }
                      } catch {
                        resultSummary = "Done";
                      }
                    }

                    return (
                      <ToolCallCard
                        key={tc.id}
                        name={tc.name}
                        argsSummary={argsSummary}
                        resultSummary={resultSummary}
                        resultContent={result?.content}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}

      {isWaiting && (
        <div className="flex justify-start">
          <div className="bg-muted rounded-lg px-4 py-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
      </div>
    </div>
  );
}

function ToolCallCard({
  name,
  argsSummary,
  resultSummary,
  resultContent,
}: {
  name: string;
  argsSummary: string;
  resultSummary: string;
  resultContent?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="py-2">
      <CardContent className="px-3 py-0">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{name}</Badge>
          <span className="text-xs text-muted-foreground truncate">
            {argsSummary ? `Searching for "${argsSummary}"` : "Running..."}
          </span>
        </div>
        {resultSummary && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted-foreground mt-1 hover:text-foreground cursor-pointer"
          >
            → {resultSummary} {expanded ? "▾" : "▸"}
          </button>
        )}
        {expanded && resultContent && (
          <pre className="text-xs mt-2 p-2 bg-muted rounded max-h-40 overflow-auto whitespace-pre-wrap">
            {resultContent}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
