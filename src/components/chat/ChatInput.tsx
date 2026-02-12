import { useState } from "react";
import { Paperclip, Send } from "lucide-react";
import { Button } from "~/components/ui/button";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder = "Type a message..." }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="px-4">
      <div className="max-w-[750px] mx-auto w-full border border-b-0 border-border rounded-t-2xl bg-muted/30 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] flex flex-col h-[125px]">
        {/* Textarea + Send row */}
        <div className="flex items-start flex-1 gap-2 px-4 pt-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          />
          <Button
            variant="default"
            size="icon"
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            className="rounded-lg h-8 w-8 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Action pills */}
        <div className="flex items-center gap-2 px-4 pb-4">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm text-muted-foreground rounded-full border border-border hover:bg-muted transition-colors"
          >
            <Paperclip className="h-3.5 w-3.5" />
            Attach
          </button>
        </div>
      </div>
    </div>
  );
}
