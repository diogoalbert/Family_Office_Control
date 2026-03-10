import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { toast } from "sonner";
import { Bot, Trash2, Info, Sparkles } from "lucide-react";

export default function Chat() {
  const { data: history = [] } = trpc.chat.history.useQuery();
  const askMutation = trpc.chat.ask.useMutation({
    onError: (err) => toast.error("Error querying AI: " + err.message),
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [screenCleared, setScreenCleared] = useState(false);

  // Sync history from server to local messages
  useEffect(() => {
    if (!screenCleared && history.length > 0) {
      const mapped: Message[] = history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
      setMessages(mapped);
    }
  }, [history, screenCleared]);

  const handleSend = async (content: string) => {
    if (screenCleared) setScreenCleared(false);
    // Optimistic update
    setMessages((prev) => [...prev, { role: "user", content }]);

    try {
      const result = await askMutation.mutateAsync({ question: content });
      setMessages((prev) => [...prev, { role: "assistant", content: result.answer }]);
    } catch {
      // Error handled by onError
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground flex items-center gap-3">
            <Bot className="w-8 h-8 text-primary" />
            AI Chat
          </h1>
          <p className="text-muted-foreground mt-1">
            Ask the assistant about the project, tasks, and uploaded documents
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setMessages([]);
            setScreenCleared(true);
          }}
          disabled={messages.length === 0}
          className="gap-2 border-border hover:border-destructive/40 hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
          Clear History
        </Button>
      </div>

      {/* RAG Context Info */}
      <Card className="bg-card border-border">
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Assistant with RAG Enabled</p>
              <p className="text-xs text-muted-foreground mt-1">
                The assistant has access to current project status and processed documents from the Documents tab. Ask about tasks, deadlines, team members, or document content.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggested Questions */}
      {messages.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            "What is the overall project status?",
            "Which tasks are pending this week?",
            "Who is responsible for Week 3 tasks?",
            "What are Diogo’s main pending items?",
            "Summarize each team member’s progress",
            "Which documents were uploaded to the repository?",
          ].map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              className="text-left p-3 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-sm text-muted-foreground hover:text-foreground"
            >
              <span className="text-primary mr-2">→</span>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Chat Box */}
      <Card className="bg-card border-border overflow-hidden">
        <CardContent className="p-0">
          <AIChatBox
            messages={messages}
            onSendMessage={handleSend}
            isLoading={askMutation.isPending}
            placeholder="Ask about the project, tasks, or documents..."
            height={520}
            className="border-0 rounded-none"
          />
        </CardContent>
      </Card>

      {/* Info */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>
          The assistant uses Retrieval-Augmented Generation (RAG) to retrieve relevant information from documents and current project status before answering.
        </p>
      </div>
    </div>
  );
}
