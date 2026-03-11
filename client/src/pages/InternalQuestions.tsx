import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ClipboardList } from "lucide-react";

type QuestionRow = {
  code: string;
  dueWeek: number;
  owner: string;
  workstream: string;
  question: string;
  requiredSources: string;
  outputFormat: string;
  answer: string;
  answerUpdatedAt: Date | null;
};

export default function InternalQuestions() {
  const utils = trpc.useUtils();
  const { data = [], isLoading } = trpc.internalQuestions.list.useQuery();
  const updateAnswer = trpc.internalQuestions.updateAnswer.useMutation({
    onSuccess: async () => {
      await utils.internalQuestions.list.invalidate();
      toast.success("Answer saved");
    },
    onError: (error) => {
      toast.error(error.message || "Error saving answer");
    },
  });

  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [editingByCode, setEditingByCode] = useState<Record<string, boolean>>({});
  const [ownerFilter, setOwnerFilter] = useState("");
  const [weekFilter, setWeekFilter] = useState<string>("all");

  useEffect(() => {
    if (data.length === 0) return;
    const next: Record<string, string> = {};
    data.forEach((q) => {
      next[q.code] = q.answer ?? "";
    });
    setDraftAnswers(next);
  }, [data]);

  const weekOptions = useMemo(() => {
    const weeks = Array.from(new Set((data as QuestionRow[]).map((q) => q.dueWeek)));
    return weeks.sort((a, b) => a - b);
  }, [data]);

  const filteredQuestions = useMemo(() => {
    const ownerNeedle = ownerFilter.trim().toLowerCase();
    return (data as QuestionRow[]).filter((q) => {
      if (weekFilter !== "all" && q.dueWeek !== Number.parseInt(weekFilter, 10)) return false;
      if (ownerNeedle && !q.owner.toLowerCase().includes(ownerNeedle)) return false;
      return true;
    });
  }, [data, ownerFilter, weekFilter]);

  const groupedByWeek = useMemo(() => {
    const map = new Map<number, QuestionRow[]>();
    filteredQuestions.forEach((q) => {
      const list = map.get(q.dueWeek) ?? [];
      list.push(q);
      map.set(q.dueWeek, list);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filteredQuestions]);

  const handleSave = async (code: string) => {
    await updateAnswer.mutateAsync({
      code,
      answer: draftAnswers[code] ?? "",
    });
    setEditingByCode((prev) => ({ ...prev, [code]: false }));
  };

  const handleEdit = (q: QuestionRow) => {
    setDraftAnswers((prev) => ({
      ...prev,
      [q.code]: q.answer ?? "",
    }));
    setEditingByCode((prev) => ({ ...prev, [q.code]: true }));
  };

  const handleCancel = (q: QuestionRow) => {
    setDraftAnswers((prev) => ({
      ...prev,
      [q.code]: q.answer ?? "",
    }));
    setEditingByCode((prev) => ({ ...prev, [q.code]: false }));
  };

  const handleDelete = async (q: QuestionRow) => {
    await updateAnswer.mutateAsync({
      code: q.code,
      answer: "",
    });
    setDraftAnswers((prev) => ({
      ...prev,
      [q.code]: "",
    }));
    setEditingByCode((prev) => ({ ...prev, [q.code]: false }));
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
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-primary" />
          Internal Questions
        </h1>
        <p className="text-muted-foreground mt-1">
          Internal due diligence questions with answers to facilitate third-party review.
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-64 max-w-full space-y-1">
              <Label className="text-xs text-muted-foreground">Owner name</Label>
              <Input
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                placeholder="Type owner name..."
                className="h-9 bg-secondary border-border"
              />
            </div>
            <div className="w-40 max-w-full space-y-1">
              <Label className="text-xs text-muted-foreground">Week</Label>
              <Select value={weekFilter} onValueChange={setWeekFilter}>
                <SelectTrigger className="h-9 bg-secondary border-border">
                  <SelectValue placeholder="All weeks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All weeks</SelectItem>
                  {weekOptions.map((week) => (
                    <SelectItem key={week} value={String(week)}>Week {week}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(ownerFilter || weekFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOwnerFilter("");
                  setWeekFilter("all");
                }}
                className="h-9"
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {groupedByWeek.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No questions found with current filters.
          </CardContent>
        </Card>
      )}

      {groupedByWeek.map(([week, questions]) => (
        <Card key={week} className="bg-card border-border">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm text-foreground">Week {week}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 pt-0">
            {questions.map((q) => (
              <div key={q.code} className="rounded-lg border border-border p-3 bg-secondary/20 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">{q.code}</Badge>
                  <Badge variant="secondary" className="text-xs">{q.workstream}</Badge>
                </div>

                <p className="text-sm text-foreground leading-relaxed">{q.question}</p>

                <div className="grid gap-2 md:grid-cols-2">
                  <p className="text-xs text-muted-foreground"><span className="font-semibold">Owner:</span> {q.owner}</p>
                  <p className="text-xs text-muted-foreground"><span className="font-semibold">Required sources:</span> {q.requiredSources}</p>
                </div>
                <p className="text-xs text-muted-foreground"><span className="font-semibold">Output format:</span> {q.outputFormat}</p>

                {(() => {
                  const hasSavedAnswer = (q.answer ?? "").trim().length > 0;
                  const isEditing = editingByCode[q.code] || !hasSavedAnswer;

                  if (isEditing) {
                    return (
                      <div className="space-y-2">
                        <Label htmlFor={`answer-${q.code}`} className="text-sm text-foreground">Answer</Label>
                        <Textarea
                          id={`answer-${q.code}`}
                          value={draftAnswers[q.code] ?? ""}
                          onChange={(e) =>
                            setDraftAnswers((prev) => ({
                              ...prev,
                              [q.code]: e.target.value,
                            }))
                          }
                          placeholder="Type the answer to this question..."
                          className="bg-background border-border min-h-28"
                        />
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      <Label className="text-sm text-foreground">Answer</Label>
                      <div className="rounded-md border border-border bg-background p-3 text-sm text-foreground whitespace-pre-wrap">
                        {q.answer}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {q.answerUpdatedAt
                      ? `Last updated: ${q.answerUpdatedAt.toLocaleString()}`
                      : "No saved answer yet"}
                  </p>
                  {(() => {
                    const hasSavedAnswer = (q.answer ?? "").trim().length > 0;
                    const isEditing = editingByCode[q.code] || !hasSavedAnswer;

                    if (isEditing) {
                      return (
                        <div className="flex items-center gap-2">
                          {hasSavedAnswer && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleCancel(q)}
                              disabled={updateAnswer.isPending}
                            >
                              Cancel
                            </Button>
                          )}
                          <Button
                            onClick={() => handleSave(q.code)}
                            disabled={updateAnswer.isPending}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            {updateAnswer.isPending ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      );
                    }

                    return (
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" onClick={() => handleEdit(q)} disabled={updateAnswer.isPending}>
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => handleDelete(q)}
                          disabled={updateAnswer.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
