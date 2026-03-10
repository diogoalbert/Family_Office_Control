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
      const userName = ctx.user?.name ?? "User";

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
          contextText = scored.map((c, i) => `[Excerpt ${i + 1}]\n${c.content}`).join("\n\n---\n\n");
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
            return `Week ${t.week} | ${member?.name ?? "?"}: "${t.description}" → ${t.status}${t.pendingReason ? ` (Pending reason: ${t.pendingReason})` : ""}`;
          })
          .join("\n");

        projectContext = `\n\n## Current Project Status\n${taskSummary}`;
      } catch (err) {
        console.warn("[Chat] Could not load project status:", err);
      }

      // ── Build system prompt ───────────────────────────────────────────────────
      const systemPrompt = `You are the AI assistant for the MMLaw Family Office management platform. You have access to current project status and uploaded team documents.

Always respond in English, clearly, objectively, and professionally. If requested information is not available in the provided context, state that clearly.

${contextText ? `## Documents Relevantes\n${contextText}` : ""}
${projectContext}`;

      // ── Call LLM ─────────────────────────────────────────────────────────────
      let answer =
        "Sorry, I could not generate a response right now.";
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
          "AI integration is not configured in this local environment. " +
          "Set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY in .env to enable assistant responses.";
      }

      // Save assistant message
      await saveChatMessage({
        userId: ctx.user?.id,
        userName: "AI Assistant",
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
