import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  clearChatHistory,
  getAllChunksWithEmbeddings,
  getAllTasks,
  getAllTeamMembers,
  getRecentChatMessages,
  saveChatMessage,
} from "../db";
import { invokeLLM } from "../_core/llm";
import { cosineSimilarity, generateEmbedding } from "./documents";

const TOP_K = 5; // Number of most relevant chunks to retrieve

export const chatRouter = router({
  history: publicProcedure.query(async () => {
    const msgs = await getRecentChatMessages(100);
    return msgs.reverse(); // Return in chronological order
  }),

  ask: protectedProcedure
    .input(
      z.object({
        question: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { question } = input;
      const userName = ctx.user?.name ?? "Usuário";

      // Save user message
      await saveChatMessage({
        userId: ctx.user?.id,
        userName,
        role: "user",
        content: question,
      });

      // ── RAG: Retrieve relevant context ──────────────────────────────────────
      let contextText = "";
      let usedChunkIds: number[] = [];

      try {
        // Generate embedding for the question
        const questionEmbedding = await generateEmbedding(question);

        // Get all chunks with embeddings
        const allChunks = await getAllChunksWithEmbeddings();

        if (allChunks.length > 0) {
          // Compute similarities
          const scored = allChunks
            .filter((c) => c.embedding && Array.isArray(c.embedding))
            .map((c) => ({
              ...c,
              score: cosineSimilarity(questionEmbedding, c.embedding as number[]),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, TOP_K);

          usedChunkIds = scored.map((c) => c.id);
          contextText = scored.map((c, i) => `[Trecho ${i + 1}]\n${c.content}`).join("\n\n---\n\n");
        }
      } catch (err) {
        console.warn("[RAG] Could not retrieve context:", err);
      }

      // ── Build project status context ─────────────────────────────────────────
      let projectContext = "";
      try {
        const [members, tasks] = await Promise.all([getAllTeamMembers(), getAllTasks()]);
        const memberMap = new Map(members.map((m) => [m.id, m]));

        const taskSummary = tasks
          .map((t) => {
            const member = memberMap.get(t.memberId);
            return `Semana ${t.week} | ${member?.name ?? "?"}: "${t.description}" → ${t.status}${t.pendingReason ? ` (Pendência: ${t.pendingReason})` : ""}`;
          })
          .join("\n");

        projectContext = `\n\n## Status Atual do Projeto\n${taskSummary}`;
      } catch (err) {
        console.warn("[Chat] Could not load project status:", err);
      }

      // ── Build system prompt ───────────────────────────────────────────────────
      const systemPrompt = `Você é o assistente de IA da plataforma de gestão do Family Office MMLaw. Você tem acesso ao status atual do projeto e aos documentos carregados pela equipe.

Responda sempre em português, de forma clara, objetiva e profissional. Se a informação solicitada não estiver disponível no contexto fornecido, diga isso claramente.

${contextText ? `## Documentos Relevantes\n${contextText}` : ""}
${projectContext}`;

      // ── Call LLM ─────────────────────────────────────────────────────────────
      let answer =
        "Desculpe, não consegui gerar uma resposta no momento.";
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ],
        });

        answer =
          (typeof response.choices[0]?.message?.content === "string"
            ? response.choices[0].message.content
            : null) ?? answer;
      } catch (err) {
        console.warn("[Chat] LLM unavailable:", err);
        answer =
          "A integração de IA não está configurada neste ambiente local. " +
          "Defina BUILT_IN_FORGE_API_URL e BUILT_IN_FORGE_API_KEY no .env para habilitar respostas do assistente.";
      }

      // Save assistant message
      await saveChatMessage({
        userId: ctx.user?.id,
        userName: "Assistente IA",
        role: "assistant",
        content: answer,
        contextUsed: usedChunkIds.length > 0 ? JSON.stringify(usedChunkIds) : null,
      });

      return { answer, usedChunks: usedChunkIds.length };
    }),

  clearHistory: protectedProcedure.mutation(async () => {
    await clearChatHistory();
    return { success: true };
  }),
});
