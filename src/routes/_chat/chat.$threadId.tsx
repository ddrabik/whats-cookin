import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ChatMessageList } from "~/components/chat/ChatMessageList";
import { ChatInput } from "~/components/chat/ChatInput";

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

  const isWaiting =
    messages.length > 0 && messages[messages.length - 1].role === "user";

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
