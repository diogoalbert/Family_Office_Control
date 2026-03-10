import { z } from "zod";
import { INTERNAL_QUESTIONS } from "../../shared/internalQuestions";
import { getInternalQuestions, upsertInternalQuestionAnswer } from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

const QUESTION_CODES = INTERNAL_QUESTIONS.map((q) => q.code) as [string, ...string[]];

export const internalQuestionsRouter = router({
  list: publicProcedure.query(async () => {
    return getInternalQuestions();
  }),

  updateAnswer: protectedProcedure
    .input(
      z.object({
        code: z.enum(QUESTION_CODES),
        answer: z.string().max(30000),
      })
    )
    .mutation(async ({ input }) => {
      await upsertInternalQuestionAnswer(input.code, input.answer);
      return { success: true };
    }),
});

