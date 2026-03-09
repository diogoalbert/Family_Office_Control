import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, Plus, Pencil, Trash2, Sparkles, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const PRESET_COLORS = [
  "#c084fc", "#60a5fa", "#34d399", "#f59e0b", "#f87171", "#a78bfa", "#38bdf8", "#fb923c",
];

const INITIAL_TEAM = [
  { name: "Márcio Matos", role: "Partner / Líder do Projeto", area: "Steering", color: "#c084fc" },
  { name: "Diogo Reis", role: "Portugal Tax", area: "Tax, Reporting, Classification", color: "#60a5fa" },
  { name: "Gonçalo", role: "Architecture / Legal", area: "Legal Reasoning, Governance", color: "#34d399" },
  { name: "Michalis Zachariou", role: "Cyprus Governance", area: "Substance, Process Control", color: "#f59e0b" },
  { name: "Melissa Furlan", role: "Coordenação", area: "Supervisão", color: "#f87171" },
  { name: "Rafaela Oliveira", role: "Coordenação", area: "Supervisão", color: "#a78bfa" },
  { name: "Victor Tassini", role: "Project Management", area: "PMO, Ferramentas de Tracking", color: "#38bdf8" },
];

export default function Team() {
  const utils = trpc.useUtils();
  const { data: members = [], isLoading } = trpc.teamMembers.list.useQuery();
  const { data: tasks = [] } = trpc.tasks.list.useQuery();

  const createMember = trpc.teamMembers.create.useMutation({
    onSuccess: () => { utils.teamMembers.list.invalidate(); toast.success("Membro adicionado!"); setShowCreate(false); },
    onError: () => toast.error("Erro ao adicionar membro"),
  });
  const updateMember = trpc.teamMembers.update.useMutation({
    onSuccess: () => { utils.teamMembers.list.invalidate(); toast.success("Membro atualizado!"); setEditingMember(null); },
    onError: () => toast.error("Erro ao atualizar membro"),
  });
  const deleteMember = trpc.teamMembers.delete.useMutation({
    onSuccess: () => { utils.teamMembers.list.invalidate(); toast.success("Membro removido!"); },
    onError: () => toast.error("Erro ao remover membro"),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [editingMember, setEditingMember] = useState<typeof members[0] | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);

  const openCreate = () => {
    setFormName(""); setFormRole(""); setFormArea(""); setFormColor(PRESET_COLORS[0]);
    setShowCreate(true);
  };

  const openEdit = (m: typeof members[0]) => {
    setFormName(m.name); setFormRole(m.role); setFormArea(m.area ?? ""); setFormColor(m.color ?? PRESET_COLORS[0]);
    setEditingMember(m);
  };

  const handleCreate = async () => {
    if (!formName.trim() || !formRole.trim()) { toast.error("Nome e cargo são obrigatórios"); return; }
    await createMember.mutateAsync({ name: formName, role: formRole, area: formArea || undefined, color: formColor });
  };

  const handleUpdate = async () => {
    if (!editingMember || !formName.trim() || !formRole.trim()) return;
    await updateMember.mutateAsync({ id: editingMember.id, name: formName, role: formRole, area: formArea || undefined, color: formColor });
  };

  const handleSeedTeam = async () => {
    for (const m of INITIAL_TEAM) {
      await createMember.mutateAsync(m);
    }
    toast.success("Equipe inicial carregada!");
  };

  const getMemberStats = (memberId: number) => {
    const memberTasks = tasks.filter((t) => t.memberId === memberId);
    return {
      total: memberTasks.length,
      completed: memberTasks.filter((t) => t.status === "completed").length,
      inProgress: memberTasks.filter((t) => t.status === "in_progress").length,
      pending: memberTasks.filter((t) => t.status === "pending").length,
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const FormFields = () => (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label className="text-sm text-foreground">Nome *</Label>
        <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nome completo" className="bg-secondary border-border" />
      </div>
      <div className="space-y-2">
        <Label className="text-sm text-foreground">Cargo *</Label>
        <Input value={formRole} onChange={(e) => setFormRole(e.target.value)} placeholder="Ex: Portugal Tax" className="bg-secondary border-border" />
      </div>
      <div className="space-y-2">
        <Label className="text-sm text-foreground">Área</Label>
        <Input value={formArea} onChange={(e) => setFormArea(e.target.value)} placeholder="Ex: Tax, Reporting" className="bg-secondary border-border" />
      </div>
      <div className="space-y-2">
        <Label className="text-sm text-foreground">Cor</Label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFormColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${formColor === c ? "border-white scale-110" : "border-transparent"}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Equipe do Projeto
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie os membros da equipe MMLaw</p>
        </div>
        <div className="flex gap-2">
          {members.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedTeam}
              disabled={createMember.isPending}
              className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
            >
              <Sparkles className="w-4 h-4" />
              Carregar Equipe Inicial
            </Button>
          )}
          <Button onClick={openCreate} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Novo Membro
          </Button>
        </div>
      </div>

      {/* Team Grid */}
      {members.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center space-y-4">
            <Users className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <div>
              <p className="text-foreground font-medium">Nenhum membro cadastrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em "Carregar Equipe Inicial" para adicionar os membros do projeto MMLaw automaticamente.
              </p>
            </div>
            <Button
              onClick={handleSeedTeam}
              disabled={createMember.isPending}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Sparkles className="w-4 h-4" />
              Carregar Equipe Inicial
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => {
            const stats = getMemberStats(member.id);
            const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
            const initials = member.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

            return (
              <Card key={member.id} className="bg-card border-border hover:border-primary/30 transition-all group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                        style={{ backgroundColor: member.color ?? "#6366f1" }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                        {member.area && (
                          <p className="text-xs text-muted-foreground/70 truncate">{member.area}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(member)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteMember.mutate({ id: member.id })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Task Stats */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold text-primary">{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progress}%`,
                          background: progress === 100 ? "oklch(0.70 0.14 145)" : "oklch(0.78 0.12 75)",
                        }}
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <div className="flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{stats.completed}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-amber-400">
                        <Clock className="w-3 h-3" />
                        <span>{stats.inProgress}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-red-400">
                        <AlertCircle className="w-3 h-3" />
                        <span>{stats.pending}</span>
                      </div>
                      <span className="text-xs text-muted-foreground ml-auto">{stats.total} total</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-foreground">Novo Membro</DialogTitle>
          </DialogHeader>
          <FormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-border">Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMember.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {createMember.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingMember} onOpenChange={(o) => !o && setEditingMember(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-foreground">Editar Membro</DialogTitle>
          </DialogHeader>
          <FormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)} className="border-border">Cancelar</Button>
            <Button onClick={handleUpdate} disabled={updateMember.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {updateMember.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
