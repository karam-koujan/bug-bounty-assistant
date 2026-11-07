"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Loader2, ChevronRight, Wand2, ShieldCheck } from "lucide-react";
import {
  hypothesisCreateSchema,
  hypothesisStatusSchema,
} from "@/lib/validation/hypotheses";
import { formatDateTime, getStatusColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

interface Hypothesis {
  id: string;
  programId: string;
  featureId: string | null;
  title: string;
  statement: string;
  category: string;
  supportingEvidenceJson: string;
  contradictingEvidenceJson: string;
  assumptionsJson: string;
  prerequisitesJson: string;
  testPlan: string | null;
  expectedVulnerableResult: string | null;
  expectedSafeResult: string | null;
  potentialImpact: string | null;
  status: string;
  priorityScore: number;
  priorityBreakdownJson: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface HypothesesTabProps {
  programId: string;
  initialHypotheses: Hypothesis[];
  features: { id: string; name: string }[];
}

const hypothesisFormSchema = hypothesisCreateSchema
  .omit({ programId: true, status: true })
  .extend({ title: z.string().min(1, "Title is required"), statement: z.string().min(1, "Statement is required") });

type HypothesisFormData = z.infer<typeof hypothesisFormSchema>;

function parseIdArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function HypothesesTab({ programId, initialHypotheses, features }: HypothesesTabProps) {
  const router = useRouter();
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>(initialHypotheses);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Hypothesis | null>(null);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ status: "", featureId: "", search: "" });

  const fetchHypotheses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "100" });
      if (filters.status) params.set("status", filters.status);
      if (filters.featureId) params.set("featureId", filters.featureId);
      if (filters.search) params.set("search", filters.search);
      const res = await fetch(`/api/programs/${programId}/hypotheses?${params}`);
      const data = await res.json();
      setHypotheses(data.data || []);
    } catch (e) {
      console.error("Failed to fetch hypotheses:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    void fetchHypotheses();
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  }, [programId, filters]);

  const handleCreate = async (data: HypothesisFormData) => {
    setError(null);
    try {
      const res = await fetch(`/api/programs/${programId}/hypotheses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to create hypothesis");
        return;
      }
      setCreating(false);
      await fetchHypotheses();
      router.refresh();
    } catch (e) {
      console.error("Failed to create hypothesis:", e);
      setError("Failed to create hypothesis.");
    }
  };

  const handleSaveEdit = async (data: HypothesisFormData) => {
    if (!editing) return;
    setError(null);
    try {
      const res = await fetch(`/api/programs/${programId}/hypotheses/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to save hypothesis");
        return;
      }
      setEditing(null);
      await fetchHypotheses();
      router.refresh();
    } catch (e) {
      console.error("Failed to save hypothesis:", e);
      setError("Failed to save hypothesis.");
    }
  };

  const handleGenerate = async (featureId: string) => {
    if (!featureId) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate-hypotheses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId, featureId }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(`Generation failed: ${body.error ?? "unknown error"}`);
        return;
      }
      await fetchHypotheses();
      router.refresh();
    } catch (e) {
      console.error("AI hypothesis generation failed:", e);
      setError("AI hypothesis generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveForTesting = async (hypothesisId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/ai/approval?`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hypothesisId, status: "approved", decidedBy: "researcher", notes: "Approved for testing from hypotheses list" }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Approval failed");
        return;
      }
      await fetchHypotheses();
      router.refresh();
    } catch (e) {
      console.error("Approval failed:", e);
      setError("Approval failed.");
    }
  };

  const handleDelete = async (hypothesisId: string) => {
    if (!confirm("Delete this hypothesis?")) return;
    try {
      const res = await fetch(`/api/programs/${programId}/hypotheses/${hypothesisId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete hypothesis");
      await fetchHypotheses();
      router.refresh();
    } catch (e) {
      console.error("Failed to delete hypothesis:", e);
      alert("Failed to delete hypothesis.");
    }
  };

  const evidenceNames = useMemo(() => new Map<string, string>(), []);
  const currentEvidence = useMemo(() => parseIdArray(editing?.supportingEvidenceJson ?? "[]"), [editing]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Hypotheses</h2>
          <p className="text-muted-foreground">Evidence-based, testable hypotheses — the AI proposes, the researcher approves.</p>
        </div>
        <div className="flex gap-2">
          <FeatureGenerateButton
            features={features}
            generating={generating}
            onGenerate={handleGenerate}
            onPickFeature={(featureId) => void handleGenerate(featureId)}
          />
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Hypothesis
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardContent className="flex flex-col sm:flex-row gap-4 pt-6">
          <Select value={filters.status} onValueChange={(v) => setFilters((p) => ({ ...p, status: v }))}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(hypothesisStatusSchema.options as readonly string[]).map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.featureId} onValueChange={(v) => setFilters((p) => ({ ...p, featureId: v }))}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="All features" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All features</SelectItem>
              {features.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="Search hypotheses…"
            className="flex-1"
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>List</CardTitle>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        </CardHeader>
        <CardContent>
          {hypotheses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hypotheses yet. Generate them from a feature or add one manually.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hypotheses.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="max-w-xs truncate font-medium">{h.title}</TableCell>
                      <TableCell>{h.category.replace(/_/g, " ")}</TableCell>
                      <TableCell>{h.priorityScore.toFixed(1)}</TableCell>
                      <TableCell><Badge className={getStatusColor(h.status)}>{h.status.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell>{formatDateTime(h.updatedAt)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/programs/${programId}/hypotheses/${h.id}`)}>
                          <ChevronRight className="h-4 w-4" /> View
                        </Button>
                        {h.status === "ready_for_review" && (
                          <Button variant="ghost" size="sm" onClick={() => handleApproveForTesting(h.id)}>
                            <ShieldCheck className="h-4 w-4 mr-1" /> Approve
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setEditing(h)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(h.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {(creating || editing) && (
        <HypothesisForm
          editing={editing ? {
            title: editing.title,
            statement: editing.statement,
            category: editing.category,
            featureId: editing.featureId,
            supportingEvidenceJson: currentEvidence,
            contradictingEvidenceJson: parseIdArray(editing.contradictingEvidenceJson),
            assumptionsJson: parseIdArray(editing.assumptionsJson),
            prerequisitesJson: parseIdArray(editing.prerequisitesJson),
            testPlan: editing.testPlan ?? "",
            expectedVulnerableResult: editing.expectedVulnerableResult ?? "",
            expectedSafeResult: editing.expectedSafeResult ?? "",
            potentialImpact: editing.potentialImpact ?? "medium",
            priorityScore: editing.priorityScore,
            priorityBreakdownJson: {},
          } : null}
          features={features}
          evidenceNames={evidenceNames}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSubmit={editing ? (d) => handleSaveEdit(d) : (d) => handleCreate(d)}
        />
      )}
    </div>
  );
}

function FeatureGenerateButton({
  features,
  generating,
  onGenerate,
  onPickFeature,
}: {
  features: { id: string; name: string }[];
  generating: boolean;
  onGenerate: (featureId: string) => void;
  onPickFeature: (featureId: string) => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={generating || features.length === 0}>
          {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
          Generate from Feature
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Hypotheses for a Feature</DialogTitle>
        </DialogHeader>
        {features.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add a feature first, then generate evidence-based hypotheses for it.</p>
        ) : (
          <div className="space-y-3">
            {features.map((f) => (
              <Button
                key={f.id}
                variant="secondary"
                className="w-full justify-between"
                onClick={() => onPickFeature(f.id)}
              >
                {f.name} <ChevronRight className="h-4 w-4" />
              </Button>
            ))}
          </div>
        )}
        <Button className="hidden" onClick={() => onGenerate("")}>go</Button>
      </DialogContent>
    </Dialog>
  );
}

function HypothesisForm({
  editing,
  features,
  evidenceNames,
  onClose,
  onSubmit,
}: {
  editing: HypothesisFormData | null;
  features: { id: string; name: string }[];
  evidenceNames: Map<string, string>;
  onClose: () => void;
  onSubmit: (data: HypothesisFormData) => void;
}) {
  const [data, setData] = useState<HypothesisFormData>(
    editing ?? {
      featureId: undefined,
      title: "",
      statement: "",
      category: "authorization",
      supportingEvidenceJson: [],
      contradictingEvidenceJson: [],
      assumptionsJson: [],
      prerequisitesJson: [],
      testPlan: "",
      expectedVulnerableResult: "",
      expectedSafeResult: "",
      potentialImpact: "medium",
      priorityScore: 0,
      priorityBreakdownJson: {},
    }
  );
  const [assumptionsText, setAssumptionsText] = useState((editing?.assumptionsJson ?? []).join(", "));
  const [prerequisitesText, setPrerequisitesText] = useState((editing?.prerequisitesJson ?? []).join(", "));
  const [error, setError] = useState<string | null>(null);

  const change = (field: keyof HypothesisFormData, value: unknown) =>
    setData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = hypothesisFormSchema.safeParse({
      ...data,
      assumptionsJson: assumptionsText.split(",").map((s) => s.trim()).filter(Boolean),
      prerequisitesJson: prerequisitesText.split(",").map((s) => s.trim()).filter(Boolean),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Validation failed");
      return;
    }
    setError(null);
    onSubmit(parsed.data);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Hypothesis" : "New Hypothesis"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="h-title">Title *</Label>
            <Input id="h-title" value={data.title} onChange={(e) => change("title", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="h-statement">Hypothesis Statement *</Label>
            <Textarea id="h-statement" rows={3} value={data.statement} onChange={(e) => change("statement", e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={data.category} onValueChange={(v) => change("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["authorization", "authentication", "input_validation", "business_logic", "information_disclosure", "session_management", "crypto", "configuration", "other"].map((c) => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Feature</Label>
              <Select value={data.featureId ?? ""} onValueChange={(v) => change("featureId", v || undefined)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">None</SelectItem>
                  {features.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Potential Impact</Label>
              <Select value={data.potentialImpact} onValueChange={(v) => change("potentialImpact", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["critical", "high", "medium", "low", "informational"].map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Supporting Evidence IDs (comma-separated UUIDs)</Label>
            <Input value={data.supportingEvidenceJson.join(", ")} onChange={(e) => change("supportingEvidenceJson", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
          </div>
          <div className="space-y-2">
            <Label>Contradicting Evidence IDs (comma-separated UUIDs)</Label>
            <Input value={data.contradictingEvidenceJson.join(", ")} onChange={(e) => change("contradictingEvidenceJson", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assumptions (comma-separated)</Label>
              <Input value={assumptionsText} onChange={(e) => setAssumptionsText(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Prerequisites (comma-separated)</Label>
              <Input value={prerequisitesText} onChange={(e) => setPrerequisitesText(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Test Plan</Label>
            <Textarea rows={3} value={data.testPlan ?? ""} onChange={(e) => change("testPlan", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expected vulnerable result</Label>
              <Textarea rows={2} value={data.expectedVulnerableResult ?? ""} onChange={(e) => change("expectedVulnerableResult", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Expected safe result</Label>
              <Textarea rows={2} value={data.expectedSafeResult ?? ""} onChange={(e) => change("expectedSafeResult", e.target.value)} />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit">{editing ? "Save" : "Create Draft"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
