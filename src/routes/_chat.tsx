import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_chat")({
  component: ChatLayout,
});

function ChatLayout() {
  return (
    <div className="flex h-screen bg-background">
      <Outlet />
    </div>
  );
}
