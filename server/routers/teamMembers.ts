import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createTeamMember,
  deleteTeamMember,
  getAllTeamMembers,
  updateTeamMember,
} from "../db";

export const teamMembersRouter = router({
  list: publicProcedure.query(async () => {
    return getAllTeamMembers();
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(128),
        role: z.string().min(1).max(128),
        area: z.string().max(128).optional(),
        color: z.string().max(32).optional(),
        userId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await createTeamMember(input);
      return { success: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(128).optional(),
        role: z.string().min(1).max(128).optional(),
        area: z.string().max(128).optional(),
        color: z.string().max(32).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateTeamMember(id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteTeamMember(input.id);
      return { success: true };
    }),
});
