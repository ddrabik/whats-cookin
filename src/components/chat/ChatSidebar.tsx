import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { BookOpen, Menu, Plus, X } from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import { formatRelativeTime } from "~/lib/utils";

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const activeThreadId = (params as { threadId?: string }).threadId;

  const { data: threads = [] } = useSuspenseQuery(
    convexQuery(api.threads.list, { limit: 10 })
  );

  return (
    <div className="flex flex-col h-full">
      {/* New Chat button */}
      <div className="p-4">
        <Button
          variant="default"
          className="w-full justify-start gap-2"
          onClick={() => {
            void navigate({ to: "/" });
            onClose?.();
          }}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Recent threads */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {threads.map((thread) => (
          <Button
            key={thread._id}
            variant={activeThreadId === thread._id ? "secondary" : "ghost"}
            className="w-full justify-start text-left h-auto py-2 px-3"
            onClick={() => {
              void navigate({
                to: "/chat/$threadId",
                params: { threadId: thread._id },
              });
              onClose?.();
            }}
          >
            <div className="truncate flex-1">
              <span className="text-sm truncate block">{thread.title}</span>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(thread.updatedAt)}
              </span>
            </div>
          </Button>
        ))}
      </div>

      {/* Cookbook link */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={() => {
            void navigate({ to: "/cookbook" });
            onClose?.();
          }}
        >
          <BookOpen className="h-4 w-4" />
          Cookbook
        </Button>
      </div>
    </div>
  );
}

export function ChatSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 border-r border-border bg-muted/30 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar dialog */}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="h-full w-80 p-0 left-0 top-0 translate-x-0 translate-y-0 rounded-none border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left" showCloseButton={false}>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <span className="font-semibold">Chats</span>
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SidebarContent onClose={() => setMobileOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
