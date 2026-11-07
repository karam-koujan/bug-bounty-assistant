import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import {
  programs,
  hypotheses,
  features,
  evidence,
  testObservations,
} from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import Link from "next/link";
import { ChevronRight, Lightbulb } from "lucide-react";
import { HypothesisDetailActions } from "@/components/hypotheses/hypothesis-detail-actions";
import { notFound } from "next/navigation";
import { formatDateTime, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HypothesisDetailPage({
  params,
}: {
  params: Promise<{ id: string; hypothesisId: string }>;
}) {
  const { id: programId, hypothesisId } = await params;

  const program = (await db.select().from(programs).where(eq(programs.id, programId)).limit(1))[0];
  if (!program) notFound();

  const hypothesis = (
    await db
      .select()
      .from(hypotheses)
      .where(and(eq(hypotheses.id, hypothesisId), eq(hypotheses.programId, programId)))
      .limit(1)
  )[0];
  if (!hypothesis) notFound();

  const feature = hypothesis.featureId
    ? (await db.select().from(features).where(eq(features.id, hypothesis.featureId)).limit(1))[0]
    : null;

  const supportingIds = safeIdArray(hypothesis.supportingEvidenceJson);
  const contradictingIds = safeIdArray(hypothesis.contradictingEvidenceJson);
  const referencedIds = [...new Set([...supportingIds, ...contradictingIds])];

  const [evidenceRows, observations] = await Promise.all([
    referencedIds.length > 0
      ? db.select().from(evidence).where(and(inArray(evidence.id, referencedIds), eq(evidence.programId, programId)))
      : Promise.resolve([]),
    db
      .select()
      .from(testObservations)
      .where(eq(testObservations.hypothesisId, hypothesisId))
      .orderBy(desc(testObservations.createdAt)),
  ]);

  const evidenceById = new Map(evidenceRows.map((e) => [e.id, e]));

  function renderEvidenceLinks(ids: string[]) {
    if (ids.length === 0) return <p className="text-sm text-muted-foreground">None recorded.</p>;
    return (
      <ul className="space-y-1">
        {ids.map((eid) => {
          const ev = evidenceById.get(eid);
          return (
            <li key={eid}>
              {ev ? (
                <Link href={`/programs/${programId}/evidence`} className="text-sm text-primary hover:underline">
                  {ev.title} ({ev.evidenceType.replace(/_/g, " ")})
                </Link>
              ) : (
                <span className="text-sm text-red-600">Missing evidence record: {eid.slice(0, 8)}…</span>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/programs/${programId}/hypotheses`} className="p-2 rounded hover:bg-accent">
              <ChevronRight className="h-5 w-5 rotate-180" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold">{hypothesis.title}</h1>
              </div>
              <p className="text-muted-foreground">
                {feature ? `Feature: ${feature.name}` : "No feature linked"} · Priority {hypothesis.priorityScore.toFixed(1)}
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(hypothesis.status)}>{hypothesis.status.replace(/_/g, " ")}</Badge>
        </div>

        <HypothesisDetailActions
          programId={programId}
          hypothesisId={hypothesis.id}
          hypothesisStatus={hypothesis.status}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Statement & Plausibility</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p>{hypothesis.statement}</p>
              <p className="text-sm text-muted-foreground">Category: {hypothesis.category.replace(/_/g, " ")}</p>
              {hypothesis.testPlan && (
                <div>
                  <p className="font-medium text-sm">Test Plan</p>
                  <p className="text-sm whitespace-pre-wrap">{hypothesis.testPlan}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Evidence</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium text-sm text-green-600">Supporting</p>
                {renderEvidenceLinks(supportingIds)}
              </div>
              <div>
                <p className="font-medium text-sm text-red-600">Contradicting</p>
                {renderEvidenceLinks(contradictingIds)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Assumptions & Prerequisites</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium text-sm">Assumptions</p>
                {safeIdArray(hypothesis.assumptionsJson).length === 0 ? (
                  <p className="text-sm text-muted-foreground">None recorded.</p>
                ) : (
                  <ul className="list-disc pl-5 text-sm">{safeIdArray(hypothesis.assumptionsJson).map((a, i) => <li key={i}>{a}</li>)}</ul>
                )}
              </div>
              <div>
                <p className="font-medium text-sm">Prerequisites</p>
                {safeIdArray(hypothesis.prerequisitesJson).length === 0 ? (
                  <p className="text-sm text-muted-foreground">None recorded.</p>
                ) : (
                  <ul className="list-disc pl-5 text-sm">{safeIdArray(hypothesis.prerequisitesJson).map((a, i) => <li key={i}>{a}</li>)}</ul>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Expected Behavior</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium text-sm">If vulnerable</p>
                <p className="text-sm whitespace-pre-wrap">{hypothesis.expectedVulnerableResult || "—"}</p>
              </div>
              <div>
                <p className="font-medium text-sm">If safe</p>
                <p className="text-sm whitespace-pre-wrap">{hypothesis.expectedSafeResult || "—"}</p>
              </div>
              <div>
                <p className="font-medium text-sm">Potential impact</p>
                <p className="text-sm">{hypothesis.potentialImpact ?? "—"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Observations ({observations.length})</CardTitle></CardHeader>
          <CardContent>
            {observations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No observations recorded yet. Record them from an active session.</p>
            ) : (
              <ul className="space-y-3">
                {observations.map((o) => (
                  <li key={o.id} className="border rounded p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{o.testDescription}</p>
                      <span className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</span>
                    </div>
                    <p className="text-sm"><span className="font-medium">Expected:</span> {o.expectedResult || "—"}</p>
                    <p className="text-sm"><span className="font-medium">Actual:</span> {o.actualResult || "—"}</p>
                    <p className="text-sm"><span className="font-medium">Conclusion:</span> {o.conclusion || "inconclusive"}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function safeIdArray(json: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(json ?? "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
