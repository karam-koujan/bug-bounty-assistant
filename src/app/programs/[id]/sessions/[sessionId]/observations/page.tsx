import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { programs, testObservations, evidence, hypotheses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, MessageSquare, FileText, Target, Lightbulb, Database, ClipboardList } from "lucide-react";
import { formatDateTime, getStatusColor } from "@/lib/utils";
import { ObservationsTab } from "@/components/sessions/observations-tab";

const tabs = [
  { name: "Overview", href: "overview", icon: FileText },
  { name: "Scope & Rules", href: "scope", icon: Target },
  { name: "Assets", href: "assets", icon: Database },
  { name: "Features", href: "features", icon: Lightbulb },
  { name: "Endpoints", href: "endpoints", icon: ClipboardList },
  { name: "Hypotheses", href: "hypotheses", icon: Lightbulb },
  { name: "Evidence", href: "evidence", icon: FileText },
  { name: "Sessions", href: "sessions", icon: ClipboardList },
  { name: "Reports", href: "reports", icon: FileText },
];

async function getProgram(id: string) {
  const program = await db.select().from(programs).where(eq(programs.id, id)).limit(1);
  return program[0];
}

async function getSession(programId: string, sessionId: string) {
  const { researchSessions } = await import('@/lib/db/schema');
  const { eq, and } = await import('drizzle-orm');
  return db.select().from(researchSessions).where(and(eq(researchSessions.programId, programId), eq(researchSessions.id, sessionId))).limit(1);
}

async function getObservations(programId: string, sessionId: string) {
  return db.select().from(testObservations).where(and(eq(testObservations.sessionId, sessionId), eq(testObservations.programId, programId))).orderBy(testObservations.createdAt);
}

async function getEvidence(programId: string) {
  return db.select({ id: evidence.id, title: evidence.title }).from(evidence).where(eq(evidence.programId, programId));
}

async function getHypotheses(programId: string) {
  return db.select({ id: hypotheses.id, title: hypotheses.title }).from(hypotheses).where(eq(hypotheses.programId, programId));
}

export default async function ProgramSessionObservationsPage({ params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = await params;
  const program = await getProgram(id);
  const sessionResult = await getSession(id, sessionId);
  const session = sessionResult[0];
  const observationsList = await getObservations(id, sessionId);
  const evidenceList = await getEvidence(id);
  const hypothesesList = await getHypotheses(id);

  if (!program || !session) {
    notFound();
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/programs/${program.id}/sessions/${sessionId}`} className="p-2 rounded hover:bg-accent">
              <ChevronRight className="h-5 w-5 rotate-180" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold">Observations</h1>
              </div>
              <p className="text-muted-foreground">{session.objective}</p>
            </div>
          </div>
        </div>

        <nav className="flex gap-1 p-1 rounded-lg bg-muted/50" aria-label="Session tabs">
          <Link
            href={`/programs/${program.id}/sessions/${sessionId}`}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Session</span>
          </Link>
          <Link
            href={`/programs/${program.id}/sessions/${sessionId}/observations`}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-primary bg-primary/10"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Observations</span>
          </Link>
        </nav>

        <ObservationsTab
          programId={program.id}
          sessionId={session.id}
          session={session}
          initialObservations={observationsList}
          initialEvidence={evidenceList}
        />
      </div>
    </AppShell>
  );
}