"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Play, Pause, Square, Loader2, Clock, ArrowRight, FileText, MessageSquare } from "lucide-react";
import { sessionCreateSchema, sessionListQuerySchema } from "@/lib/validation";
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

interface Session {
  id: string;
  programId: string;
  hypothesisId: string | null;
  objective: string;
  sessionNotes: string | null;
  handoffSummary: string | null;
  nextStepsJson: string;
  startedAt: string | Date;
  endedAt: string | Date | null;
  updatedAt: string | Date;
}

interface SessionsTabProps {
  programId: string;
  initialSessions?: Session[];
  initialHypotheses?: { id: string; title: string }[];
}

const sessionFormSchema = sessionCreateSchema.omit({ programId: true }).extend({
  objective: z.string().min(1, "Objective is required"),
  nextStepsJson: z.array(z.string()).default([]),
});

type SessionFormData = z.infer<typeof sessionFormSchema>;

export function SessionsTab({ programId, initialSessions = [], initialHypotheses = [] }: SessionsTabProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ hypothesisId: "", search: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...filters,
      });
      const res = await fetch(`/api/programs/${programId}/sessions?${params}`);
      const data = await res.json();
      setSessions(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [programId, currentPage, filters]);

  const handleSubmit = async (data: SessionFormData) => {
    try {
      const res = await fetch(`/api/programs/${programId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to save session");

      router.refresh();
    } catch (error) {
      console.error("Failed to save session:", error);
      alert("Failed to save session. Please try again.");
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm("Delete this session?")) return;
    try {
      const res = await fetch(`/api/programs/${programId}/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete session");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete session:", error);
      alert("Failed to delete session.");
    }
  };

  const getStatusBadge = (session: Session) => {
    if (session.endedAt) {
      return <Badge variant="secondary">Completed</Badge>;
    }
    return <Badge variant="default">In Progress</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Research Sessions</h2>
          <p className="text-muted-foreground">Track research progress with timed sessions and observations</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Start New Research Session</DialogTitle>
            </DialogHeader>
            <SessionForm onSubmit={handleSubmit} hypotheses={initialHypotheses} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={filters.hypothesisId} onValueChange={value => { setFilters(prev => ({ ...prev, hypothesisId: value })); setCurrentPage(1); }}>
              <SelectTrigger className="w-[250px]"><SelectValue placeholder="Filter by hypothesis" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Hypotheses</SelectItem>
                {initialHypotheses.map(h => <SelectItem key={h.id} value={h.id}>{h.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Input
                placeholder="Search sessions..."
                value={filters.search}
                onChange={e => { setFilters(prev => ({ ...prev, search: e.target.value })); setCurrentPage(1); }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sessions</CardTitle>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No sessions found. Click "New Session" to start.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Objective</TableHead>
                    <TableHead>Hypothesis</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Ended</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session: Session) => {
                    const hypothesis = initialHypotheses.find(h => h.id === session.hypothesisId);
                    return (
                      <TableRow key={session.id}>
                        <TableCell className="max-w-xs truncate">{session.objective}</TableCell>
                        <TableCell>{hypothesis?.title || "—"}</TableCell>
                        <TableCell>{getStatusBadge(session)}</TableCell>
                        <TableCell>{formatDateTime(session.startedAt)}</TableCell>
                        <TableCell>{session.endedAt ? formatDateTime(session.endedAt) : "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/programs/${programId}/sessions/${session.id}`)}>
                            <MessageSquare className="h-4 w-4 mr-1" /> View
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(session.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

function SessionForm({ onSubmit, hypotheses }: { onSubmit: (data: SessionFormData) => void; hypotheses: { id: string; title: string }[] }) {
  const [formData, setFormData] = useState<SessionFormData>({
    objective: "",
    hypothesisId: undefined,
    sessionNotes: "",
    handoffSummary: "",
    nextStepsJson: [],
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
        <Label htmlFor="objective">Objective *</Label>
        <Input id="objective" placeholder="What is the goal of this session?" value={formData.objective} onChange={e => handleChange("objective", e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hypothesisId">Linked Hypothesis</Label>
        <Select value={formData.hypothesisId} onValueChange={value => handleChange("hypothesisId", value)}>
          <SelectTrigger><SelectValue placeholder="Select hypothesis (optional)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {hypotheses.map(h => <SelectItem key={h.id} value={h.id}>{h.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sessionNotes">Session Notes</Label>
        <Textarea id="sessionNotes" placeholder="Notes during the session..." rows={4} value={formData.sessionNotes} onChange={e => handleChange("sessionNotes", e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="handoffSummary">Handoff Summary</Label>
        <Textarea id="handoffSummary" placeholder="Summary for next researcher..." rows={3} value={formData.handoffSummary} onChange={e => handleChange("handoffSummary", e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nextStepsJson">Next Steps (comma-separated)</Label>
        <Input id="nextStepsJson" placeholder="Test XSS, Check rate limits, Document findings" value={formData.nextStepsJson.join(", ")} onChange={e => handleArrayChange("nextStepsJson", e.target.value)} />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={() => window.history.back()}>Cancel</Button>
        <Button type="submit">Start Session</Button>
      </div>
    </form>
  );
}