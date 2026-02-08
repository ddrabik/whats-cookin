import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "~/components/ui/button";
import { MessageSquare, Search, Heart, ChefHat } from "lucide-react";

export const Route = createFileRoute("/_chat/")({
  component: ChatEmptyState,
});

const promptIdeas = [
  { text: "Plan my meals for this week", icon: ChefHat },
  { text: "Find a recipe to import", icon: Search },
  { text: "Show my favorite recipes", icon: Heart },
  { text: "What can I make with chicken?", icon: MessageSquare },
];

function ChatEmptyState() {
  const navigate = useNavigate();
  const createThread = useMutation(api.threads.create);
  const sendMessage = useMutation(api.messages.send);

  const handlePrompt = async (text: string) => {
    const threadId = await createThread({ title: text.slice(0, 50) });
    await sendMessage({ threadId, content: text });
    void navigate({ to: "/chat/$threadId", params: { threadId } });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">What's Cookin'?</h1>
          <p className="text-muted-foreground mt-2">
            Your meal planning assistant. Ask me anything about your recipes!
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {promptIdeas.map((idea) => {
            const Icon = idea.icon;
            return (
              <Button
                key={idea.text}
                variant="outline"
                className="h-auto p-4 text-left justify-start gap-3"
                onClick={() => void handlePrompt(idea.text)}
              >
                <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                <span className="text-sm">{idea.text}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
