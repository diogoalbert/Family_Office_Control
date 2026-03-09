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
    onError: (err) => toast.error("Erro ao consultar IA: " + err.message),
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
            Chat com IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Consulte o assistente sobre o projeto, tarefas e documentos carregados
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
          Limpar Histórico
        </Button>
      </div>

      {/* RAG Context Info */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Assistente com RAG Ativo</p>
              <p className="text-xs text-muted-foreground mt-1">
                O assistente tem acesso ao status atual do projeto e aos documentos processados da aba Documentos. Faça perguntas sobre tarefas, prazos, membros ou conteúdo dos documentos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggested Questions */}
      {messages.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            "Qual é o status geral do projeto?",
            "Quais tarefas estão pendentes esta semana?",
            "Quem é responsável pelas tarefas da Semana 3?",
            "Quais são as principais pendências do Diogo?",
            "Resuma o progresso de cada membro da equipe",
            "Quais documentos foram carregados no repositório?",
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
            placeholder="Faça uma pergunta sobre o projeto, tarefas ou documentos..."
            height={520}
            className="border-0 rounded-none"
          />
        </CardContent>
      </Card>

      {/* Info */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>
          O assistente usa Retrieval-Augmented Generation (RAG) para buscar informações relevantes nos documentos e no status atual do projeto antes de responder.
        </p>
      </div>
    </div>
  );
}
