import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ChatMessageList } from "~/components/chat/ChatMessageList";
import { ChatInput } from "~/components/chat/ChatInput";

const RESPONSE_TIMEOUT_MS = 60_000;

export const Route = createFileRoute("/_chat/chat/$threadId")({
  component: ThreadView,
});

function ThreadView() {
  const { threadId } = Route.useParams();
  const typedThreadId = threadId as Id<"threads">;

  const { data: messages = [] } = useSuspenseQuery(
    convexQuery(api.messages.list, { threadId: typedThreadId })
  );

  const sendMessage = useMutation(api.messages.send);

  const rawIsWaiting =
    messages.length > 0 && messages[messages.length - 1].role === "user";

  const lastMessageId =
    messages.length > 0 ? messages[messages.length - 1]._id : null;

  // Timeout fallback: if waiting for a response takes too long, re-enable input
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setTimedOut(false);
  }, [lastMessageId]);

  useEffect(() => {
    if (!rawIsWaiting) return;
    const timer = setTimeout(() => setTimedOut(true), RESPONSE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [rawIsWaiting, lastMessageId]);

  const isWaiting = rawIsWaiting && !timedOut;

  const handleSend = (content: string) => {
    void sendMessage({ threadId: typedThreadId, content });
  };

  return (
    <div className="flex-1 flex flex-col h-screen">
      <ChatMessageList messages={messages} isWaiting={isWaiting} />
      <ChatInput onSend={handleSend} disabled={isWaiting} />
    </div>
  );
}
