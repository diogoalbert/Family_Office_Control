import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, Clock, AlertCircle, GanttChart as GanttIcon } from "lucide-react";
import { useMemo } from "react";

const WEEKS = [1, 2, 3, 4, 5, 6];

const STATUS_STYLES = {
  completed: {
    bar: "bg-emerald-500/80 border-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    icon: CheckCircle2,
    label: "Concluído",
  },
  in_progress: {
    bar: "bg-amber-500/80 border-amber-400",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    icon: Clock,
    label: "Em Andamento",
  },
  pending: {
    bar: "bg-red-500/70 border-red-400",
    badge: "bg-red-500/15 text-red-400 border-red-500/30",
    icon: AlertCircle,
    label: "Pendente",
  },
};

function getStatusStyle(status: unknown) {
  if (status === "completed" || status === "in_progress" || status === "pending") {
    return STATUS_STYLES[status];
  }
  return STATUS_STYLES.pending;
}

export default function GanttChart() {
  const { data: tasks = [], isLoading } = trpc.tasks.list.useQuery();
  const { data: members = [] } = trpc.teamMembers.list.useQuery();

  const ganttData = useMemo(() => {
    return members.map((member) => {
      const memberTasks = tasks.filter((t) => t.memberId === member.id);
      const weekMap = new Map<number, typeof memberTasks>();
      WEEKS.forEach((w) => {
        weekMap.set(w, memberTasks.filter((t) => t.week === w));
      });
      return { member, weekMap };
    });
  }, [members, tasks]);

  const weekStats = useMemo(() => {
    return WEEKS.map((week) => {
      const weekTasks = tasks.filter((t) => t.week === week);
      const completed = weekTasks.filter((t) => t.status === "completed").length;
      const total = weekTasks.length;
      return { week, completed, total, progress: total > 0 ? Math.round((completed / total) * 100) : 0 };
    });
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground flex items-center gap-3">
          <GanttIcon className="w-8 h-8 text-primary" />
          Cronograma Gantt
        </h1>
        <p className="text-muted-foreground mt-1">Visualização do progresso por membro e semana</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_STYLES).map(([status, config]) => (
          <div key={status} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${config.badge}`}>
            <config.icon className="w-3 h-3" />
            {config.label}
          </div>
        ))}
      </div>

      {/* Gantt Table */}
      <Card className="bg-card border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground w-48 min-w-[12rem]">
                    Membro
                  </th>
                  {WEEKS.map((week) => {
                    const ws = weekStats.find((w) => w.week === week);
                    return (
                      <th key={week} className="p-4 text-center w-[140px] min-w-[140px]">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">Semana {week}</p>
                          {ws && ws.total > 0 && (
                            <div className="flex items-center justify-center gap-1">
                              <div className="h-1 w-16 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${ws.progress}%`,
                                    background: ws.progress === 100
                                      ? "oklch(0.70 0.14 145)"
                                      : "oklch(0.78 0.12 75)",
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{ws.progress}%</span>
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {ganttData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                      Nenhum membro ou tarefa cadastrada. Adicione membros e tarefas para visualizar o Gantt.
                    </td>
                  </tr>
                ) : (
                  ganttData.map(({ member, weekMap }, idx) => (
                    <tr
                      key={member.id}
                      className={`border-b border-border/50 ${idx % 2 === 0 ? "" : "bg-secondary/20"} hover:bg-accent/30 transition-colors`}
                    >
                      {/* Member cell */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ backgroundColor: member.color ?? "#6366f1" }}
                          >
                            {member.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{member.area ?? member.role}</p>
                          </div>
                        </div>
                      </td>

                      {/* Week cells */}
                      {WEEKS.map((week) => {
                        const weekTasks = weekMap.get(week) ?? [];
                        return (
                          <td key={week} className="p-2 w-[140px] min-w-[140px] align-top">
                            <div className="space-y-1.5 min-h-[40px]">
                              {weekTasks.length === 0 ? (
                                <div className="h-8 rounded border border-dashed border-border/40 flex items-center justify-center">
                                  <span className="text-xs text-muted-foreground/40">—</span>
                                </div>
                              ) : (
                                weekTasks.map((task) => {
                                  const style = getStatusStyle(task.status);
                                  const Icon = style.icon;
                                  return (
                                    <Tooltip key={task.id}>
                                      <TooltipTrigger asChild>
                                        <div
                                          className={`flex items-start gap-1.5 px-2 py-1.5 rounded border text-xs font-medium cursor-pointer transition-opacity hover:opacity-80 ${style.bar} text-white`}
                                        >
                                          <Icon className="w-3 h-3 shrink-0" />
                                          <span className="min-w-0 whitespace-normal break-words text-left leading-tight">
                                            {task.description}
                                          </span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs">
                                        <div className="space-y-1">
                                          <p className="font-semibold">{task.description}</p>
                                          <p className="text-xs opacity-80">Status: {style.label}</p>
                                          {task.pendingReason && (
                                            <p className="text-xs text-red-300">Pendência: {task.pendingReason}</p>
                                          )}
                                          <p className="text-xs opacity-60">Prioridade: {task.priority}</p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary by Week */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {weekStats.map((ws) => (
          <Card key={ws.week} className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground font-medium mb-2">Semana {ws.week}</p>
              <p className="text-2xl font-bold text-primary">{ws.progress}%</p>
              <p className="text-xs text-muted-foreground mt-1">{ws.completed}/{ws.total} tarefas</p>
              <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${ws.progress}%`,
                    background: ws.progress === 100 ? "oklch(0.70 0.14 145)" : "oklch(0.78 0.12 75)",
                  }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
