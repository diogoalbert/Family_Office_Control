import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createTask,
  deleteTask,
  getAllTasks,
  getOverduePendingTasks,
  getTasksByMember,
  getTasksByWeek,
  getWeekCompletionStatus,
  markTaskNotified,
  updateTask,
} from "../db";
import { notifyOwner } from "../_core/notification";
import { getAllTeamMembers } from "../db";

export const tasksRouter = router({
  list: publicProcedure.query(async () => {
    return getAllTasks();
  }),

  listByMember: publicProcedure
    .input(z.object({ memberId: z.number() }))
    .query(async ({ input }) => {
      return getTasksByMember(input.memberId);
    }),

  listByWeek: publicProcedure
    .input(z.object({ week: z.number().min(1).max(6) }))
    .query(async ({ input }) => {
      return getTasksByWeek(input.week);
    }),

  create: protectedProcedure
    .input(
      z.object({
        week: z.number().min(1).max(6),
        description: z.string().min(1),
        memberId: z.number(),
        status: z.enum(["pending", "in_progress", "completed"]).optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        pendingReason: z.string().optional(),
        responsibleId: z.number().optional(),
        dueDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const data = {
        ...input,
        pendingSince: input.status === "pending" ? new Date() : undefined,
      };
      await createTask(data);
      return { success: true };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "in_progress", "completed"]),
        pendingReason: z.string().optional(),
        responsibleId: z.number().optional(),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        week: z.number().min(1).max(6).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = { ...data };

      if (data.status === "pending") {
        updateData.pendingSince = new Date();
        updateData.completedAt = null;
      } else if (data.status === "completed") {
        updateData.completedAt = new Date();
        updateData.pendingSince = null;
        updateData.pendingReason = null;
        updateData.responsibleId = null;
      } else if (data.status === "in_progress") {
        updateData.pendingSince = null;
        updateData.pendingReason = null;
        updateData.responsibleId = null;
      }

      await updateTask(id, updateData as any);

      // Check if sprint week is complete after status update
      if (data.status === "completed" && data.week) {
        const weekStatus = await getWeekCompletionStatus(data.week);
        if (weekStatus.allDone) {
          await notifyOwner({
            title: `✅ Sprint Semana ${data.week} Concluída!`,
            content: `Todas as ${weekStatus.total} tarefas da Semana ${data.week} foram concluídas com sucesso.`,
          });
        }
      }

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteTask(input.id);
      return { success: true };
    }),

  // Check and notify about overdue pending tasks
  checkOverdueNotifications: protectedProcedure.mutation(async () => {
    const overdueTasks = await getOverduePendingTasks();
    const members = await getAllTeamMembers();
    const memberMap = new Map(members.map((m) => [m.id, m]));

    let notified = 0;
    for (const task of overdueTasks) {
      const member = memberMap.get(task.memberId);
      const responsible = task.responsibleId ? memberMap.get(task.responsibleId) : null;
      const daysPending = task.pendingSince
        ? Math.floor((Date.now() - task.pendingSince.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      await notifyOwner({
        title: `⚠️ Tarefa Crítica Pendente há ${daysPending} dias`,
        content: `Semana ${task.week} | ${member?.name ?? "Membro"}: "${task.description}"\n\nMotivo: ${task.pendingReason ?? "Não informado"}\nResponsável pela pendência: ${responsible?.name ?? "Não identificado"}`,
      });
      await markTaskNotified(task.id);
      notified++;
    }

    return { notified };
  }),

  weekStatus: publicProcedure
    .input(z.object({ week: z.number().min(1).max(6) }))
    .query(async ({ input }) => {
      return getWeekCompletionStatus(input.week);
    }),
});
