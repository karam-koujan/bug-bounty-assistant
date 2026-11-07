"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Loader2, FileText, Download, Wand2 } from "lucide-react";
import {
  reportCreateSchema,
  reportUpdateSchema,
  reportStatusSchema,
} from "@/lib/validation/reports";
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

interface Report {
  id: string;
  programId: string;
  hypothesisId: string;
  title: string;
  summary: string | null;
  affectedAsset: string | null;
  preconditions: string | null;
  reproductionStepsJson: string;
  expectedBehavior: string | null;
  actualBehavior: string | null;
  demonstratedImpact: string | null;
  remediation: string | null;
  reportStatus: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface ReportTabEvidence {
  id: string;
  title: string;
  evidenceType: string;
}

interface ReportsTabProps {
  programId: string;
  initialReports: Report[];
  confirmedHypotheses: { id: string; title: string; status: string }[];
}

/** Local form schema: all sections editable per M6.4 (citations allowed in text). */
const reportFormSchema = reportCreateSchema
  .omit({ programId: true, hypothesisId: true, reportStatus: true })
  .extend({
    title: z.string().min(1, "Title is required"),
  });

type ReportFormData = z.infer<typeof reportFormSchema>;

const SECTION_TEXT_CITATIONS = new Set(["summary", "affectedAsset", "preconditions", "expectedBehavior", "actualBehavior", "demonstratedImpact", "remediation"]);

function parseSteps(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Render `[[evidence:ID]]` citations as readable reference chips (M6.5). */
function renderCitations(text: string, evidenceById: Map<string, string>) {
  const parts = text.split(/\[\[evidence:([^\]]+)\]\]/g);
  return parts.map((part, i) => {
    // Odd indexes are captured IDs from the split.
    if (i % 2 === 1) {
      const id = part;
      return (
        <span
          key={`${id}-${i}`}
          className="inline-block text-xs font-mono bg-primary/10 text-primary rounded px-1.5 py-0.5 mx-0.5 align-text-bottom"
          title={`${id} — ${evidenceById.get(id) ?? "unknown evidence"}`}
        >
          EV: {evidenceById.get(id) ?? id.slice(0, 8)}
        </span>
      );
    }
    return <span key={`t-${i}`}>{part}</span>;
  });
}

export function ReportsTab({ programId, initialReports, confirmedHypotheses }: ReportsTabProps) {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [evidenceList, setEvidenceList] = useState<ReportTabEvidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [editing, setEditing] = useState<Report | null>(null);
  const [selectedHypothesis, setSelectedHypothesis] = useState("");
  const [filter, setFilter] = useState("");

  const evidenceById = useMemo(() => new Map(evidenceList.map((e) => [e.id, e.title])), [evidenceList]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "50" });
      if (filter && filter !== "all") params.set("status", filter);
      const res = await fetch(`/api/programs/${programId}/reports?${params}`);
      const data = await res.json();
      setReports(data.data || []);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReports();
    fetch(`/api/programs/${programId}/evidence`)
      .then((r) => r.json())
      .then((d) => setEvidenceList(d.data || []))
      .catch((e) => console.error("Failed to fetch evidence:", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, filter]);

  const handleDraft = async (hypothesisId: string) => {
    setDrafting(true);
    try {
      const res = await fetch(`/api/programs/${programId}/reports/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hypothesisId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`AI drafting failed: ${data.error ?? "unknown error"}`);
        return;
      }
      await fetchReports();
      router.refresh();
      const created = await fetch(`/api/programs/${programId}/reports/${data.id}`);
      if (created.ok) {
        const { data: report } = await created.json();
        setEditing(report);
      }
    } catch (error) {
      console.error("Failed to draft report:", error);
      alert("Failed to draft report via AI.");
    } finally {
      setDrafting(false);
    }
  };

  const handleSaveEdit = async (data: ReportFormData) => {
    if (!editing) return;
    const validated = reportUpdateSchema.parse({
      ...data,
      // status is managed separately via the workflow select, not the editor
      reportStatus: undefined,
    });
    try {
      const res = await fetch(`/api/programs/${programId}/reports/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      const body = await res.json();
      if (!res.ok) {
        alert(`Failed to save report: ${body.error ?? "unknown error"}`);
        return;
      }
      setEditing(null);
      await fetchReports();
      router.refresh();
    } catch (error) {
      console.error("Failed to save report:", error);
      alert("Failed to save report.");
    }
  };

  const handleStatusChange = async (reportId: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/programs/${programId}/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportStatus: nextStatus }),
      });
      if (!res.ok) {
        const body = await res.json();
        alert(`Failed to change status: ${body.error ?? "unknown error"}`);
        return;
      }
      await fetchReports();
      router.refresh();
    } catch (error) {
      console.error("Failed to change report status:", error);
      alert("Failed to change report status.");
    }
  };

  const handleExport = (reportId: string) => {
    window.open(`/api/programs/${programId}/reports/${reportId}/export`, "_blank");
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm("Delete this report draft?")) return;
    try {
      const res = await fetch(`/api/programs/${programId}/reports/${reportId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete report");
      await fetchReports();
      router.refresh();
    } catch (error) {
      console.error("Failed to delete report:", error);
      alert("Failed to delete report.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Reports</h2>
          <p className="text-muted-foreground">
            Drafts are generated from confirmed findings only — review every section before export.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button disabled={drafting || confirmedHypotheses.length === 0}>
              {drafting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
              {drafting ? "Drafting…" : "Create Draft"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Draft Report from Confirmed Finding</DialogTitle>
            </DialogHeader>
            {confirmedHypotheses.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No confirmed findings yet. A finding must reach the &quot;Confirmed Finding&quot; status first.
              </p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!selectedHypothesis) {
                    alert("Select a confirmed finding first.");
                    return;
                  }
                  void handleDraft(selectedHypothesis);
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="hypothesisId">Confirmed Finding</Label>
                  <Select value={selectedHypothesis} onValueChange={setSelectedHypothesis}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a confirmed finding" />
                    </SelectTrigger>
                    <SelectContent>
                      {confirmedHypotheses.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The AI drafts strictly from the recorded evidence and observations. Fabricated
                    data and unknown evidence references are stripped automatically.
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={drafting}>
                    {drafting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                    Generate Draft
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(reportStatusSchema.options as readonly string[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Report Drafts</CardTitle>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">
                No reports yet. Use &quot;Create Draft&quot; to draft a report from a confirmed finding.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="max-w-xs truncate font-medium">{report.title}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(report.reportStatus)}>{report.reportStatus}</Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(report.createdAt)}</TableCell>
                      <TableCell>{formatDateTime(report.updatedAt)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(report)}>
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleExport(report.id)}>
                          <Download className="h-4 w-4 mr-1" /> Export
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(report.id)}
                        >
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

      {editing && (
        <ReportEditor
          report={editing}
          evidenceList={evidenceList}
          evidenceById={evidenceById}
          onClose={() => setEditing(null)}
          onSubmit={handleSaveEdit}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

function ReportEditor({
  report,
  evidenceList,
  evidenceById,
  onClose,
  onSubmit,
  onStatusChange,
}: {
  report: Report;
  evidenceList: ReportTabEvidence[];
  evidenceById: Map<string, string>;
  onClose: () => void;
  onSubmit: (data: ReportFormData) => void;
  onStatusChange: (reportId: string, status: string) => void;
}) {
  const [data, setData] = useState<ReportFormData>({
    title: report.title,
    summary: report.summary ?? "",
    affectedAsset: report.affectedAsset ?? "",
    preconditions: report.preconditions ?? "",
    reproductionStepsJson: parseSteps(report.reproductionStepsJson),
    expectedBehavior: report.expectedBehavior ?? "",
    actualBehavior: report.actualBehavior ?? "",
    demonstratedImpact: report.demonstratedImpact ?? "",
    remediation: report.remediation ?? "",
  });
  const [stepsText, setStepsText] = useState(data.reproductionStepsJson.join("\n"));
  const [error, setError] = useState<string | null>(null);

  const change = (field: keyof ReportFormData, value: string) =>
    setData((prev) => ({ ...prev, [field]: value }));

  /** Insert a `[[evidence:ID]]` citation into the currently selected field. */
  const insertCitation = (field: string, value: string) => {
    if (!value) return;
    const citation = `[[evidence:${value}]]`;
    if (field === "reproductionSteps") {
      setStepsText((prev) => `${prev}${prev ? "\n" : ""}${citation}`);
    } else {
      setData((prev) => ({
        ...prev,
        [field]: `${((prev as unknown as Record<string, string>)[field] ?? "")}${citation}`,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const steps = stepsText.split("\n").map((s) => s.trim()).filter(Boolean);
    const parsed = reportFormSchema.safeParse({ ...data, reproductionStepsJson: steps });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Validation failed");
      return;
    }
    setError(null);
    onSubmit(parsed.data);
  };

  const textRow = (
    label: string,
    field: string,
    value: string,
    rows = 3,
    placeholder = ""
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`field-${field}`}>{label}</Label>
        {SECTION_TEXT_CITATIONS.has(field) && evidenceList.length > 0 && (
          <CitationPicker field={field} evidenceList={evidenceList} onInsert={insertCitation} />
        )}
      </div>
      <Textarea
        id={`field-${field}`}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(ev) => change(field as keyof ReportFormData, ev.target.value)}
      />
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>Edit Report</span>
            <StatusSelect
              initial={report.reportStatus}
              onChange={(v) => onStatusChange(report.id, v)}
            />
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="field-title">Title</Label>
            <Input
              id="field-title"
              value={data.title}
              onChange={(e) => change("title", e.target.value)}
              required
            />
          </div>

          {textRow("Summary", "summary", data.summary ?? "", 4, "Executive summary — cite evidence inline with [[evidence:ID]]")}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="field-affectedAsset">Affected Asset and Endpoint</Label>
              <CitationPicker field="affectedAsset" evidenceList={evidenceList} onInsert={insertCitation} />
            </div>
            <Input
              id="field-affectedAsset"
              placeholder="e.g. api.example.com — GET /api/v1/projects/:id"
              value={data.affectedAsset ?? ""}
              onChange={(e) => change("affectedAsset", e.target.value)}
            />
          </div>

          {textRow("Preconditions", "preconditions", data.preconditions ?? "", 2)}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="field-reproductionSteps">Steps to Reproduce (one per line)</Label>
              <CitationPicker field="reproductionSteps" evidenceList={evidenceList} onInsert={insertCitation} />
            </div>
            <Textarea
              id="field-reproductionSteps"
              rows={5}
              placeholder={"1. Authenticate as researcher account A…\n2. Send the recorded request…"}
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
            />
          </div>
          {textRow("Expected Behavior", "expectedBehavior", data.expectedBehavior ?? "", 2)}
          {textRow("Actual Behavior", "actualBehavior", data.actualBehavior ?? "", 2)}
          {textRow("Demonstrated Impact", "demonstratedImpact", data.demonstratedImpact ?? "", 3, "Only impact actually demonstrated by the recorded evidence")}
          {textRow("Suggested Remediation", "remediation", data.remediation ?? "", 3)}

          <div className="pt-2 space-y-1">
            <Label>Citation preview</Label>
            <p className="text-sm border rounded p-2 min-h-10 bg-muted/30">
              {renderCitations(
                data.summary ? data.summary : "No citations yet. Insert them with the evidence pickers above.",
                evidenceById
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Citations use the <code>[[evidence:ID]]</code> syntax seen in the summary above; they are
              exported as numbered references with an evidence appendix.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Report</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatusSelect({ initial, onChange }: { initial: string; onChange: (v: string) => void }) {
  const [status, setStatus] = useState(initial);
  return (
    <Select
      value={status}
      onValueChange={(v) => {
        setStatus(v);
        onChange(v);
      }}
    >
      <SelectTrigger className="w-52">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(reportStatusSchema.options as readonly string[]).map((s) => (
          <SelectItem key={s} value={s}>
            Status: {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CitationPicker({
  field,
  evidenceList,
  onInsert,
}: {
  field: string;
  evidenceList: ReportTabEvidence[];
  onInsert: (field: string, evidenceId: string) => void;
}) {
  return (
    <Select value="" onValueChange={(value) => onInsert(field, value)}>
      <SelectTrigger className="h-7 w-44 text-xs">
        <Plus className="h-3 w-3 mr-1" /> Add evidence citation
      </SelectTrigger>
      <SelectContent>
        {evidenceList.map((e) => (
          <SelectItem key={e.id} value={e.id}>
            {e.title} ({e.evidenceType})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
