"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Loader2, CheckCircle, XCircle, MinusCircle, ClipboardList, Timer, MessageSquare } from "lucide-react";
import { observationCreateSchema, observationListQuerySchema } from "@/lib/validation";
import { cn, formatDateTime } from "@/lib/utils";
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

interface Observation {
  id: string;
  programId: string;
  sessionId: string;
  hypothesisId: string;
  testDescription: string;
  expectedResult: string | null;
  actualResult: string | null;
  evidenceIdsJson: string;
  conclusion: string | null;
  createdAt: string | Date;
}

interface ObservationsTabProps {
  programId: string;
  sessionId: string;
  session?: { objective: string; hypothesisId: string | null };
  initialObservations?: Observation[];
  initialEvidence?: { id: string; title: string }[];
}

const observationFormSchema = observationCreateSchema.omit({ sessionId: true }).extend({
  testDescription: z.string().min(1, "Test description is required"),
  evidenceIdsJson: z.array(z.string().uuid()).default([]),
});

type ObservationFormData = z.infer<typeof observationFormSchema>;

const conclusionOptions = [
  { value: "", label: "Inconclusive" },
  { value: "supported", label: "Supported", color: "bg-green-100 text-green-800" },
  { value: "refuted", label: "Refuted", color: "bg-red-100 text-red-800" },
  { value: "inconclusive", label: "Inconclusive", color: "bg-yellow-100 text-yellow-800" },
];

export function ObservationsTab({ programId, sessionId, session, initialObservations = [], initialEvidence = [] }: ObservationsTabProps) {
  const router = useRouter();
  const [observations, setObservations] = useState<Observation[]>(initialObservations);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ hypothesisId: "", conclusion: "", search: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  const fetchObservations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...filters,
      });
      const res = await fetch(`/api/programs/${programId}/sessions/${sessionId}/observations?${params}`);
      const data = await res.json();
      setObservations(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch observations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObservations();
  }, [programId, sessionId, currentPage, filters]);

  const handleSubmit = async (data: ObservationFormData) => {
    try {
      const res = await fetch(`/api/programs/${programId}/sessions/${sessionId}/observations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to save observation");

      router.refresh();
    } catch (error) {
      console.error("Failed to save observation:", error);
      alert("Failed to save observation. Please try again.");
    }
  };

  const handleDelete = async (observationId: string) => {
    if (!confirm("Delete this observation?")) return;
    try {
      const res = await fetch(`/api/programs/${programId}/sessions/${sessionId}/observations/${observationId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete observation");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete observation:", error);
      alert("Failed to delete observation.");
    }
  };

  const getConclusionBadge = (conclusion: string | null) => {
    if (!conclusion) return <Badge variant="secondary">Inconclusive</Badge>;
    const option = conclusionOptions.find(o => o.value === conclusion);
    if (!option) return <Badge variant="secondary">{conclusion}</Badge>;
    return <Badge className={cn(option.color || "bg-gray-100 text-gray-800")}>{option.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Test Observations</h2>
          <p className="text-muted-foreground">Record test results and observations for this session</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Observation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record Test Observation</DialogTitle>
            </DialogHeader>
            <ObservationForm onSubmit={handleSubmit} evidence={initialEvidence} sessionHypothesisId={session?.hypothesisId ?? undefined} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <Select value={filters.conclusion} onValueChange={value => { setFilters(prev => ({ ...prev, conclusion: value })); setCurrentPage(1); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by conclusion" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Conclusions</SelectItem>
                {conclusionOptions.filter(o => o.value).map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Input
                placeholder="Search observations..."
                value={filters.search}
                onChange={e => { setFilters(prev => ({ ...prev, search: e.target.value })); setCurrentPage(1); }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Observations</CardTitle>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        </CardHeader>
        <CardContent>
          {observations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No observations recorded. Click "Add Observation" to start.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Description</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Conclusion</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {observations.map((obs: Observation) => (
                    <TableRow key={obs.id}>
                      <TableCell className="max-w-xs truncate">{obs.testDescription}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{obs.expectedResult || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{obs.actualResult || "—"}</TableCell>
                      <TableCell>{getConclusionBadge(obs.conclusion)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(obs.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Edit Observation</DialogTitle>
                            </DialogHeader>
                            <ObservationForm initialData={obs} onSubmit={handleSubmit} evidence={initialEvidence} sessionHypothesisId={session?.hypothesisId ?? undefined} />
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(obs.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ObservationForm({ onSubmit, initialData, evidence, sessionHypothesisId }: { onSubmit: (data: ObservationFormData) => void; initialData?: Observation; evidence: { id: string; title: string }[]; sessionHypothesisId?: string }) {
  const [formData, setFormData] = useState<ObservationFormData>({
    testDescription: initialData?.testDescription || "",
    expectedResult: initialData?.expectedResult || "",
    actualResult: initialData?.actualResult || "",
    evidenceIdsJson: initialData?.evidenceIdsJson ? JSON.parse(initialData.evidenceIdsJson) : [],
    conclusion: initialData?.conclusion || "",
    programId: initialData?.programId || "",
    hypothesisId: initialData?.hypothesisId || sessionHypothesisId || "",
  });

  const handleChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: string, value: string) => {
    const arr = value.split(",").map(s => s.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, [field]: arr }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="testDescription">Test Description *</Label>
        <Textarea id="testDescription" placeholder="Describe the test performed..." rows={4} value={formData.testDescription} onChange={e => handleChange("testDescription", e.target.value)} required />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="expectedResult">Expected Result</Label>
          <Input id="expectedResult" placeholder="What did you expect to happen?" value={formData.expectedResult} onChange={e => handleChange("expectedResult", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="actualResult">Actual Result</Label>
          <Input id="actualResult" placeholder="What actually happened?" value={formData.actualResult} onChange={e => handleChange("actualResult", e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="evidenceIdsJson">Linked Evidence (comma-separated IDs)</Label>
        <Input id="evidenceIdsJson" placeholder="ev-123, ev-456" value={formData.evidenceIdsJson.join(", ")} onChange={e => handleArrayChange("evidenceIdsJson", e.target.value)} />
        {evidence.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Available: {evidence.map(e => e.title).join(", ")}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="conclusion">Conclusion</Label>
        <Select value={formData.conclusion} onValueChange={value => handleChange("conclusion", value)}>
          <SelectTrigger><SelectValue placeholder="Select conclusion" /></SelectTrigger>
          <SelectContent>
            {conclusionOptions.filter(o => o.value).map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <input type="hidden" name="programId" value={formData.programId} />
      <input type="hidden" name="hypothesisId" value={formData.hypothesisId} />

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={() => window.history.back()}>Cancel</Button>
        <Button type="submit">Save Observation</Button>
      </div>
    </form>
  );
}