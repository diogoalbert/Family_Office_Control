import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  BarChart3,
  Filter,
} from "lucide-react";

type Task = {
  id: number;
  week: number;
  description: string;
  status: "pending" | "in_progress" | "completed";
  pendingReason: string | null;
  responsibleId: number | null;
  memberId: number | string;
  priority: "low" | "medium" | "high";
  createdAt: Date;
  updatedAt: Date;
};

const STATUS_CONFIG = {
  completed: { label: "Completed", icon: CheckCircle2, className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  in_progress: { label: "In Progress", icon: Clock, className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  pending: { label: "Pending", icon: AlertCircle, className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

const PRIORITY_CONFIG = {
  high: { label: "High", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  medium: { label: "Medium", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  low: { label: "Low", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
};

const MEMBER_COLORS = [
  "#c084fc", "#60a5fa", "#34d399", "#f59e0b", "#f87171", "#a78bfa", "#38bdf8",
];
const NO_RESPONSIBLE_VALUE = "__none__";

export default function Tasks() {
  const utils = trpc.useUtils();
  const tasksQuery = trpc.tasks.list.useQuery();
  const tasks = tasksQuery.data ?? [];
  const isLoading = tasksQuery.isLoading;
  const { data: members = [] } = trpc.teamMembers.list.useQuery();

  const updateStatus = trpc.tasks.updateStatus.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); toast.success("Task updated!"); },
    onError: (error) => toast.error(error.message || "Error updating task"),
  });
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: async () => {
      await utils.tasks.list.invalidate();
      await tasksQuery.refetch();
      setFilterMember("all");
      setFilterStatus("all");
      setFilterWeek("all");
      toast.success("Task created!");
      setShowCreate(false);
    },
    onError: (error) => toast.error(error.message || "Error creating task"),
  });
  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); toast.success("Task removed!"); },
    onError: () => toast.error("Error removing task"),
  });

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterMember, setFilterMember] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterWeek, setFilterWeek] = useState<string>("all");

  // Edit form state
  const [editStatus, setEditStatus] = useState<"pending" | "in_progress" | "completed">("pending");
  const [editReason, setEditReason] = useState("");
  const [editResponsible, setEditResponsible] = useState<string>("");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">("medium");
  const [editDesc, setEditDesc] = useState("");
  const [editWeek, setEditWeek] = useState("1");

  // Create form state
  const [newDesc, setNewDesc] = useState("");
  const [newWeek, setNewWeek] = useState("1");
  const [newMember, setNewMember] = useState("");
  const [newStatus, setNewStatus] = useState<"pending" | "in_progress" | "completed">("pending");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [newReason, setNewReason] = useState("");
  const [newResponsible, setNewResponsible] = useState<string>("");

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterMember !== "all" && Number(t.memberId) !== parseInt(filterMember, 10)) return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterWeek !== "all" && t.week !== parseInt(filterWeek, 10)) return false;
      return true;
    });
  }, [tasks, filterMember, filterStatus, filterWeek]);

  const tasksByMember = useMemo(() => {
    const grouped = new Map<number, Task[]>();
    const displayMembers = filterMember === "all" ? members : members.filter((m) => m.id === parseInt(filterMember, 10));
    displayMembers.forEach((m) => {
      const memberTasks = filteredTasks.filter((t) => Number(t.memberId) === Number(m.id));
      if (memberTasks.length > 0 || filterMember !== "all") {
        grouped.set(m.id, memberTasks);
      }
    });
    return grouped;
  }, [filteredTasks, members, filterMember]);

  const orphanTasks = useMemo(() => {
    const memberIds = new Set(members.map((m) => Number(m.id)));
    return filteredTasks.filter((t) => !memberIds.has(Number(t.memberId)));
  }, [filteredTasks, members]);

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setEditDesc(task.description);
    setEditWeek(task.week.toString());
    setEditStatus(task.status);
    setEditReason(task.pendingReason ?? "");
    setEditResponsible(task.responsibleId?.toString() ?? "");
    setEditPriority(task.priority);
  };

  const handleSaveEdit = async () => {
    if (!editingTask) return;
    if (!editDesc.trim()) {
      toast.error("Task description is required");
      return;
    }
    const parsedWeek = Number.parseInt(editWeek, 10);
    if (!Number.isFinite(parsedWeek)) {
      toast.error("Invalid week");
      return;
    }
    const hasResponsible = editResponsible !== "" && editResponsible !== NO_RESPONSIBLE_VALUE;
    await updateStatus.mutateAsync({
      id: editingTask.id,
      description: editDesc.trim(),
      status: editStatus,
      pendingReason: editStatus === "pending" ? editReason : undefined,
      responsibleId:
        editStatus === "pending" && hasResponsible
          ? parseInt(editResponsible, 10)
          : undefined,
      priority: editPriority,
      week: parsedWeek,
    });
    setEditingTask(null);
  };

  const handleCreate = async () => {
    if (!newDesc.trim() || !newMember) {
      toast.error("Fill all required fields");
      return;
    }
    const parsedWeek = Number.parseInt(newWeek, 10);
    const parsedMemberId = Number.parseInt(newMember, 10);
    if (!Number.isFinite(parsedWeek) || !Number.isFinite(parsedMemberId)) {
      toast.error("Invalid week or member");
      return;
    }
    if (newStatus === "pending" && !newReason.trim()) {
      toast.error("Provide the pending reason");
      return;
    }
    if (newStatus === "pending" && !newResponsible) {
      toast.error("Select the pending owner");
      return;
    }
    await createTask.mutateAsync({
      description: newDesc,
      week: parsedWeek,
      memberId: parsedMemberId,
      priority: newPriority,
      status: newStatus,
      pendingReason: newStatus === "pending" ? newReason.trim() : undefined,
      responsibleId: newStatus === "pending" ? parseInt(newResponsible, 10) : undefined,
    });
    setNewDesc("");
    setNewWeek("1");
    setNewMember("");
    setNewStatus("pending");
    setNewReason("");
    setNewResponsible("");
  };

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Task Management
          </h1>
          <p className="text-muted-foreground mt-1">Track and update each task status</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4" />
          New Task
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select value={filterMember} onValueChange={setFilterMember}>
              <SelectTrigger className="w-44 h-9 bg-secondary border-border">
                <SelectValue placeholder="All members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All members</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 h-9 bg-secondary border-border">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterWeek} onValueChange={setFilterWeek}>
              <SelectTrigger className="w-36 h-9 bg-secondary border-border">
                <SelectValue placeholder="All weeks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All weeks</SelectItem>
                {[1, 2, 3, 4, 5, 6].map((w) => (
                  <SelectItem key={w} value={w.toString()}>Week {w}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(filterMember !== "all" || filterStatus !== "all" || filterWeek !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFilterMember("all"); setFilterStatus("all"); setFilterWeek("all"); }}
                className="text-muted-foreground hover:text-foreground h-9"
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tasks by Member */}
      {members.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No members registered. Add members in the Team tab.</p>
          </CardContent>
        </Card>
      ) : (
        Array.from(tasksByMember.entries()).map(([memberId, memberTasks]) => {
          const member = members.find((m) => m.id === memberId);
          if (!member) return null;
          const completed = memberTasks.filter((t) => t.status === "completed").length;
          const progress = memberTasks.length > 0 ? Math.round((completed / memberTasks.length) * 100) : 0;

          return (
            <Card key={memberId} className="bg-card border-border overflow-hidden">
              <CardHeader className="pb-1 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ backgroundColor: member.color ?? "#6366f1" }}
                    >
                      {member.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-foreground">{member.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{member.area ?? member.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">{progress}%</p>
                      <p className="text-xs text-muted-foreground">{completed}/{memberTasks.length}</p>
                    </div>
                    <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${progress}%`,
                          background: progress === 100 ? "oklch(0.70 0.14 145)" : "oklch(0.78 0.12 75)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 mt-2">
                {memberTasks.length === 0 ? (
                  <div className="px-4 pb-3 text-sm text-muted-foreground">No tasks found with current filters.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-y border-border/50 bg-secondary/30">
                          <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16">Week</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Task</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-36">Status</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-24">Priority</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</th>
                          <th className="px-4 py-3 w-20"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {memberTasks
                          .sort((a, b) => a.week - b.week)
                          .map((task, idx) => {
                            const sc = STATUS_CONFIG[task.status];
                            const pc = PRIORITY_CONFIG[task.priority];
                            const responsible = task.responsibleId ? members.find((m) => m.id === task.responsibleId) : null;
                            return (
                              <tr
                                key={task.id}
                                className={`border-b border-border/30 hover:bg-accent/20 transition-colors ${idx % 2 === 0 ? "" : "bg-secondary/10"}`}
                              >
                                <td className="px-6 py-3 text-center">
                                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">S{task.week}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="text-sm font-medium text-foreground">{task.description}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant="outline" className={`text-xs gap-1 ${sc.className}`}>
                                    <sc.icon className="w-3 h-3" />
                                    {sc.label}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant="outline" className={`text-xs ${pc.className}`}>{pc.label}</Badge>
                                </td>
                                <td className="px-4 py-3">
                                  {task.pendingReason ? (
                                    <div>
                                      <p className="text-xs text-red-400 line-clamp-2">{task.pendingReason}</p>
                                      {responsible && (
                                        <p className="text-xs text-muted-foreground mt-0.5">Owner: {responsible.name}</p>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                                      onClick={() => openEdit(task as Task)}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => deleteTask.mutate({ id: task.id })}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      {orphanTasks.length > 0 && (
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-lg font-semibold text-foreground">Tasks without linked member</CardTitle>
          </CardHeader>
          <CardContent className="p-0 mt-2">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-y border-border/50 bg-secondary/30">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16">Week</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Task</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-36">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-24">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {orphanTasks
                    .sort((a, b) => a.week - b.week)
                    .map((task, idx) => {
                      const sc = STATUS_CONFIG[task.status];
                      const pc = PRIORITY_CONFIG[task.priority];
                      return (
                        <tr
                          key={`orphan-${task.id}`}
                          className={`border-b border-border/30 hover:bg-accent/20 transition-colors ${idx % 2 === 0 ? "" : "bg-secondary/10"}`}
                        >
                          <td className="px-6 py-3 text-center">
                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">S{task.week}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-foreground">{task.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">memberId: {String(task.memberId)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={`text-xs gap-1 ${sc.className}`}>
                              <sc.icon className="w-3 h-3" />
                              {sc.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={`text-xs ${pc.className}`}>{pc.label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Task Modal */}
      <Dialog open={!!editingTask} onOpenChange={(o) => !o && setEditingTask(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-foreground">Update Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Description *</Label>
                <Textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Describe the task..."
                  className="bg-secondary border-border resize-none text-sm"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-foreground">Week *</Label>
                <Select value={editWeek} onValueChange={setEditWeek}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((w) => (
                      <SelectItem key={w} value={w.toString()}>Week {w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-foreground">Status</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as any)}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-foreground">Priority</Label>
                <Select value={editPriority} onValueChange={(v) => setEditPriority(v as any)}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editStatus === "pending" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm text-foreground">Pending Reason</Label>
                    <Textarea
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      placeholder="Describe the reason for pending status..."
                      className="bg-secondary border-border resize-none text-sm"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-foreground">Pending Owner</Label>
                    <Select value={editResponsible} onValueChange={setEditResponsible}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Select owner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_RESPONSIBLE_VALUE}>Not identified</SelectItem>
                        {members.map((m) => (
                          <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingTask(null);
              }}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateStatus.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {updateStatus.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Task Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-foreground">New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Description *</Label>
              <Textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Describe the task..."
                className="bg-secondary border-border resize-none text-sm"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Status *</Label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as any)}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Week *</Label>
                <Select value={newWeek} onValueChange={setNewWeek}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((w) => (
                      <SelectItem key={w} value={w.toString()}>Week {w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Priority</Label>
                <Select value={newPriority} onValueChange={(v) => setNewPriority(v as any)}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Task Owner *</Label>
              <Select value={newMember} onValueChange={setNewMember}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select member..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newStatus === "pending" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Pending Reason *</Label>
                  <Textarea
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    placeholder="Describe the reason for pending status..."
                    className="bg-secondary border-border resize-none text-sm"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Pending Owner *</Label>
                  <Select value={newResponsible} onValueChange={setNewResponsible}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Select owner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-border">Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={createTask.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {createTask.isPending ? "Creating..." : "Criar Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
