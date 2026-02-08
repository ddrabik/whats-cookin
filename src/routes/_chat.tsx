import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ChatSidebar } from "~/components/chat/ChatSidebar";

export const Route = createFileRoute("/_chat")({
  component: ChatLayout,
});

function ChatLayout() {
  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar />
      <Outlet />
    </div>
  );
}
