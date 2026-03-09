import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  FileText,
  TrendingUp,
  Bell,
  RefreshCw,
} from "lucide-react";
import { useMemo } from "react";

const WEEKS = [1, 2, 3, 4, 5, 6];

const STATUS_CONFIG = {
  completed: { label: "Concluído", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", icon: CheckCircle2 },
  in_progress: { label: "Em Andamento", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30", icon: Clock },
  pending: { label: "Pendente", color: "text-red-400", bg: "bg-red-500/15 border-red-500/30", icon: AlertCircle },
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data: tasks = [], isLoading: tasksLoading } = trpc.tasks.list.useQuery();
  const { data: members = [] } = trpc.teamMembers.list.useQuery();
  const { data: documents = [] } = trpc.documents.list.useQuery();
  const checkOverdue = trpc.tasks.checkOverdueNotifications.useMutation();

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const pending = tasks.filter((t) => t.status === "pending").length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, pending, progress };
  }, [tasks]);

  const weekStats = useMemo(() => {
    return WEEKS.map((week) => {
      const weekTasks = tasks.filter((t) => t.week === week);
      const completed = weekTasks.filter((t) => t.status === "completed").length;
      const total = weekTasks.length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { week, total, completed, progress };
    });
  }, [tasks]);

  const memberStats = useMemo(() => {
    return members.map((m) => {
      const memberTasks = tasks.filter((t) => t.memberId === m.id);
      const completed = memberTasks.filter((t) => t.status === "completed").length;
      const inProgress = memberTasks.filter((t) => t.status === "in_progress").length;
      const pending = memberTasks.filter((t) => t.status === "pending").length;
      const total = memberTasks.length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { ...m, total, completed, inProgress, pending, progress };
    });
  }, [members, tasks]);

  const recentPending = useMemo(() => {
    return tasks
      .filter((t) => t.status === "pending")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [tasks]);

  const handleCheckNotifications = async () => {
    try {
      const result = await checkOverdue.mutateAsync();
      toast.success(`${result.notified} notificação(ões) enviada(s) ao owner`);
    } catch {
      toast.error("Erro ao verificar notificações");
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo, <span className="text-primary font-medium">{user?.name?.split(" ")[0]}</span>. Aqui está o resumo do projeto.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCheckNotifications}
          disabled={checkOverdue.isPending}
          className="gap-2 border-border hover:border-primary/40"
        >
          {checkOverdue.isPending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          Verificar Pendências
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total de Tarefas", value: stats.total, icon: TrendingUp, color: "text-primary" },
          { label: "Concluídas", value: stats.completed, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Em Andamento", value: stats.inProgress, icon: Clock, color: "text-amber-400" },
          { label: "Pendentes", value: stats.pending, icon: AlertCircle, color: "text-red-400" },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</p>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress + Members */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overall Progress */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">Progresso Geral do Projeto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between mb-2">
              <span className="text-4xl font-bold text-primary">{stats.progress}%</span>
              <span className="text-sm text-muted-foreground">{stats.completed}/{stats.total} tarefas</span>
            </div>
            <Progress value={stats.progress} className="h-2" />

            <div className="space-y-3 pt-2">
              {weekStats.map((w) => (
                <div key={w.week} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Semana {w.week}</span>
                    <span className="text-foreground">{w.completed}/{w.total}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${w.progress}%`,
                        background: w.progress === 100
                          ? "oklch(0.70 0.14 145)"
                          : w.progress > 50
                          ? "oklch(0.78 0.12 75)"
                          : "oklch(0.65 0.15 200)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Member Status */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Status por Membro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {memberStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum membro cadastrado ainda.
              </p>
            ) : (
              memberStats.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0"
                    style={{ backgroundColor: m.color ?? "#6366f1" }}
                  >
                    {m.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={m.progress} className="h-1 flex-1" />
                      <span className="text-xs text-muted-foreground shrink-0">{m.progress}%</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">{m.completed}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">{m.inProgress}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">{m.pending}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Pending + Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Pending Tasks */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              Tarefas Pendentes Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPending.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentPending.map((task) => {
                  const member = members.find((m) => m.id === task.memberId);
                  return (
                    <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{task.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Semana {task.week} · {member?.name ?? "?"}
                        </p>
                        {task.pendingReason && (
                          <p className="text-xs text-red-400/80 mt-1 line-clamp-1">{task.pendingReason}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents & Quick Stats */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Repositório de Documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{documents.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-400">
                  {documents.filter((d) => d.processed).length}
                </p>
                <p className="text-xs text-muted-foreground">Processados</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-400">
                  {documents.filter((d) => !d.processed).length}
                </p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>

            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.slice(0, 4).map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{doc.originalName}</p>
                      <p className="text-xs text-muted-foreground">{doc.uploaderName}</p>
                    </div>
                    <Badge variant="outline" className={doc.processed ? "text-emerald-400 border-emerald-500/30" : "text-amber-400 border-amber-500/30"}>
                      {doc.processed ? "✓" : "..."}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum documento carregado ainda.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
