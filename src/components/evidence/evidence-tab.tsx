"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, FileText, Eye, Search, Filter, Loader2, Hash, Shield, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { evidenceCreateSchema, evidenceTypeSchema, verificationStatusSchema, evidenceParamsSchema } from "@/lib/validation";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RedactionAwareContentField } from "@/components/evidence/redaction-aware-content-field";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

interface EvidenceTabProps {
  programId: string;
  initialEvidence?: any[];
}

const evidenceTypeOptions = [
  { value: "program_policy", label: "Program Policy" },
  { value: "official_documentation", label: "Official Documentation" },
  { value: "security_advisory", label: "Security Advisory" },
  { value: "release_note", label: "Release Note" },
  { value: "technology_observation", label: "Technology Observation" },
  { value: "endpoint_observation", label: "Endpoint Observation" },
  { value: "http_request", label: "HTTP Request" },
  { value: "http_response", label: "HTTP Response" },
  { value: "manual_test_result", label: "Manual Test Result" },
  { value: "screenshot_or_attachment", label: "Screenshot/Attachment" },
  { value: "researcher_conclusion", label: "Researcher Conclusion" },
];

const verificationStatusOptions = [
  { value: "unverified", label: "Unverified", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
  { value: "verified", label: "Verified", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  { value: "disputed", label: "Disputed", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
];

const evidenceFormSchema = evidenceCreateSchema.omit({ programId: true }).extend({
  content: z.string().min(1, "Content is required"),
  notes: z.string().optional(),
});

type EvidenceFormData = z.infer<typeof evidenceFormSchema>;

export function EvidenceTab({ programId, initialEvidence = [] }: EvidenceTabProps) {
  const router = useRouter();
  const [evidence, setEvidence] = useState(initialEvidence);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ type: "", verificationStatus: "", search: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...filters,
      });
      const res = await fetch(`/api/programs/${programId}/evidence?${params}`);
      const data = await res.json();
      setEvidence(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch evidence:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, [programId, currentPage, filters]);

  const handleSubmit = async (data: EvidenceFormData) => {
    try {
      const res = await fetch(`/api/programs/${programId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to save evidence");

      router.refresh();
    } catch (error) {
      console.error("Failed to save evidence:", error);
      alert("Failed to save evidence. Please try again.");
    }
  };

  const handleDelete = async (evidenceId: string) => {
    if (!confirm("Delete this evidence record?")) return;
    try {
      const res = await fetch(`/api/programs/${programId}/evidence/${evidenceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete evidence");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete evidence:", error);
      alert("Failed to delete evidence.");
    }
  };

  const getStatusBadge = (status: string) => {
    const option = verificationStatusOptions.find(o => o.value === status);
    if (!option) return <Badge variant="secondary">{status}</Badge>;
    return <Badge className={cn(option.color)}>{option.label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const option = evidenceTypeOptions.find(o => o.value === type);
    return option?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Evidence */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Evidence</h2>
          <p className="text-muted-foreground">Record observations, documents, and test results</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Evidence
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Evidence Record</DialogTitle>
            </DialogHeader>
            <EvidenceForm onSubmit={handleSubmit} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search evidence..."
                value={filters.search}
                onChange={e => { setFilters(prev => ({ ...prev, search: e.target.value })); setCurrentPage(1); }}
                className="pl-10"
              />
            </div>
            <Select value={filters.type} onValueChange={value => { setFilters(prev => ({ ...prev, type: value })); setCurrentPage(1); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {evidenceTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.verificationStatus} onValueChange={value => { setFilters(prev => ({ ...prev, verificationStatus: value })); setCurrentPage(1); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Verification status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                {verificationStatusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Evidence Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Evidence Records</CardTitle>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        </CardHeader>
        <CardContent>
          {evidence.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No evidence records found. Click "Add Evidence" to create one.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evidence.map((ev: any) => (
                    <TableRow key={ev.id}>
                      <TableCell className="max-w-xs truncate">
                        <span className="font-medium">{ev.title}</span>
                        <p className="text-xs text-muted-foreground line-clamp-1">{ev.content.substring(0, 100)}...</p>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{getTypeLabel(ev.evidenceType)}</Badge></TableCell>
                      <TableCell>{getStatusBadge(ev.verificationStatus)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ev.sourceUrl || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(ev.collectedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>{ev.title}</DialogTitle>
                            </DialogHeader>
                            <EvidenceDetail evidence={ev} />
                          </DialogContent>
                        </Dialog>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Edit Evidence</DialogTitle>
                            </DialogHeader>
                            <EvidenceForm initialData={ev} onSubmit={handleSubmit} />
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(ev.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                      Next
                    </Button>
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

function EvidenceForm({ onSubmit, initialData }: { onSubmit: (data: EvidenceFormData) => void; initialData?: any }) {
  const [formData, setFormData] = useState<EvidenceFormData>({
    evidenceType: "technology_observation",
    title: "",
    content: "",
    sourceUrl: initialData?.sourceUrl || "",
    collectedAt: initialData?.collectedAt ? new Date(initialData.collectedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    verificationStatus: "unverified",
    notes: initialData?.notes || "",
    ...initialData,
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="evidenceType">Evidence Type *</Label>
          <Select value={formData.evidenceType} onValueChange={value => handleChange("evidenceType", value as any)}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {evidenceTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="verificationStatus">Verification Status</Label>
          <Select value={formData.verificationStatus} onValueChange={value => handleChange("verificationStatus", value as any)}>
            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent>
              {verificationStatusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" placeholder="Brief descriptive title" value={formData.title} onChange={e => handleChange("title", e.target.value)} required />
      </div>

      <div className="space-y-2">
        <RedactionAwareContentField value={formData.content} onChange={(next) => handleChange("content", next)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="interpretation">Interpretation / Notes</Label>
        <Textarea id="interpretation" placeholder="Your interpretation, hypotheses, or notes about this observation (separate from facts)" rows={4} value={formData.notes} onChange={e => handleChange("notes", e.target.value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sourceUrl">Source URL</Label>
          <Input id="sourceUrl" type="url" placeholder="https://..." value={formData.sourceUrl || ""} onChange={e => handleChange("sourceUrl", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="collectedAt">Collected Date</Label>
          <Input id="collectedAt" type="date" value={formData.collectedAt} onChange={e => handleChange("collectedAt", e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={() => window.history.back()}>Cancel</Button>
        <Button type="submit">Save Evidence</Button>
      </div>
    </form>
  );
}

function EvidenceDetail({ evidence }: { evidence: any }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Evidence Type</Label>
          <Badge variant="secondary">{evidenceTypeOptions.find(o => o.value === evidence.evidenceType)?.label || evidence.evidenceType}</Badge>
        </div>
        <div className="space-y-2">
          <Label>Verification Status</Label>
          <Badge className={verificationStatusOptions.find(o => o.value === evidence.verificationStatus)?.color || "bg-gray-100 text-gray-800"}>
            {verificationStatusOptions.find(o => o.value === evidence.verificationStatus)?.label || evidence.verificationStatus}
          </Badge>
        </div>
        <div className="space-y-2">
          <Label>Content Hash</Label>
          <code className="text-sm font-mono text-muted-foreground">{evidence.contentHash || "—"}</code>
        </div>
        <div className="space-y-2">
          <Label>Collected</Label>
          <span className="text-sm">{formatDateTime(evidence.collectedAt)}</span>
        </div>
      </div>

      {evidence.sourceUrl && (
        <div className="space-y-2">
          <Label>Source URL</Label>
          <a href={evidence.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
            {evidence.sourceUrl}
          </a>
        </div>
      )}

      <div className="space-y-2">
        <Label>Observed Fact</Label>
        <div className="prose max-w-none whitespace-pre-wrap text-sm border rounded-lg p-4 bg-muted/50">{evidence.content}</div>
      </div>

      {evidence.notes && (
        <div className="space-y-2 border-t pt-4">
          <Label>Interpretation / Notes</Label>
          <div className="prose max-w-none whitespace-pre-wrap text-sm border rounded-lg p-4 bg-muted/50">{evidence.notes}</div>
        </div>
      )}

      {evidence.metadataJson && Object.keys(evidence.metadataJson).length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <Label>Metadata</Label>
          <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-auto">
            {(() => { try { return JSON.stringify(evidence.metadataJson, null, 2); } catch { return '[Invalid JSON]'; } })()}
          </pre>
        </div>
      )}
    </div>
  );
}