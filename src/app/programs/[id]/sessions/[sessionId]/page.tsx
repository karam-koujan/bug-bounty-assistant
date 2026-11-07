import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { programs, researchSessions, testObservations, evidence, hypotheses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ClipboardList, FileText, Target, Lightbulb, Database, Lightbulb as Lightbulb2, MessageSquare, Timer, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, getStatusColor } from "@/lib/utils";
import { SessionsTab } from "@/components/sessions/sessions-tab";
import { ObservationsTab } from "@/components/sessions/observations-tab";

const tabs = [
  { name: "Overview", href: "overview", icon: FileText },
  { name: "Scope & Rules", href: "scope", icon: Target },
  { name: "Assets", href: "assets", icon: Database },
  { name: "Features", href: "features", icon: Lightbulb2 },
  { name: "Endpoints", href: "endpoints", icon: ClipboardList },
  { name: "Hypotheses", href: "hypotheses", icon: Lightbulb2 },
  { name: "Evidence", href: "evidence", icon: FileText },
  { name: "Sessions", href: "sessions", icon: ClipboardList },
  { name: "Reports", href: "reports", icon: FileText },
];

async function getProgram(id: string) {
  const program = await db.select().from(programs).where(eq(programs.id, id)).limit(1);
  return program[0];
}

async function getSession(programId: string, sessionId: string) {
  return db.select().from(researchSessions).where(and(eq(researchSessions.programId, programId), eq(researchSessions.id, sessionId))).limit(1);
}

async function getObservations(programId: string, sessionId: string) {
  return db.select().from(testObservations).where(and(eq(testObservations.sessionId, sessionId), eq(testObservations.programId, programId))).orderBy(testObservations.createdAt);
}

async function getEvidence(programId: string) {
  return db.select({ id: evidence.id, title: evidence.title }).from(evidence).where(eq(evidence.programId, programId));
}

export default async function ProgramSessionDetailPage({ params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = await params;
  const program = await getProgram(id);
  const sessionResult = await getSession(id, sessionId);
  const session = sessionResult[0];
  const observationsList = await getObservations(id, sessionId);
  const evidenceList = await getEvidence(id);

  if (!program || !session) {
    notFound();
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/programs/${program.id}/sessions`} className="p-2 rounded hover:bg-accent">
              <ChevronRight className="h-5 w-5 rotate-180" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold">{session.objective}</h1>
              </div>
              <p className="text-muted-foreground">Session Details</p>
            </div>
          </div>
        </div>

        <nav className="flex gap-1 p-1 rounded-lg bg-muted/50" aria-label="Session tabs">
          <Link
            href={`/programs/${program.id}/sessions/${sessionId}`}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-primary bg-primary/10"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Session</span>
          </Link>
          <Link
            href={`/programs/${program.id}/sessions/${sessionId}/observations`}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Observations</span>
          </Link>
        </nav>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <SessionDetail session={session} program={program} />
          </div>
          <div className="space-y-6">
            <SessionActions sessionId={session.id} programId={program.id} />
            <SessionTimeline session={session} />
          </div>
        </div>

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

function SessionDetail({ session, program }: { session: any; program: any }) {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Session Details</h2>
        <dl className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd className="font-medium">
                {session.endedAt ? (
                  <Badge variant="secondary">Completed</Badge>
                ) : (
                  <Badge variant="default">In Progress</Badge>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Started</dt>
              <dd className="font-medium">{formatDateTime(session.startedAt)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Ended</dt>
              <dd className="font-medium">{session.endedAt ? formatDateTime(session.endedAt) : "In progress"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Duration</dt>
              <dd className="font-medium">
                {session.endedAt
                  ? `${Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000 / 60)} min`
                  : "Running..."}
              </dd>
            </div>
          </div>
        </dl>
      </section>

      {session.sessionNotes && (
        <section className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Session Notes</h2>
          <div className="prose max-w-none whitespace-pre-wrap text-sm">{session.sessionNotes}</div>
        </section>
      )}

      {session.handoffSummary && (
        <section className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Handoff Summary</h2>
          <div className="prose max-w-none whitespace-pre-wrap text-sm">{session.handoffSummary}</div>
        </section>
      )}
    </div>
  );
}

function SessionActions({ sessionId, programId }: { sessionId: string; programId: string }) {
  return (
    <section className="rounded-lg border p-6">
      <h2 className="text-lg font-semibold mb-4">Actions</h2>
      <div className="space-y-2">
        <Link
          href={`/programs/${programId}/sessions/${sessionId}/observations`}
          className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
        >
          <MessageSquare className="h-5 w-5" />
          <span>Record Observations</span>
        </Link>
        <Link
          href={`/programs/${programId}/hypotheses`}
          className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
        >
          <Lightbulb2 className="h-5 w-5" />
          <span>View Hypotheses</span>
        </Link>
        <Link
          href={`/programs/${programId}/evidence`}
          className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
        >
          <FileText className="h-5 w-5" />
          <span>View Evidence</span>
        </Link>
      </div>
    </section>
  );
}

function SessionTimeline({ session }: { session: any }) {
  return (
    <section className="rounded-lg border p-6">
      <h2 className="text-lg font-semibold mb-4">Timeline</h2>
      <div className="space-y-4">
        <TimelineItem
          time={formatDateTime(session.startedAt)}
          title="Session Started"
          description="Research session initiated"
          icon={<Timer className="h-5 w-5 text-green-500" />}
        />
        {!session.endedAt && (
          <TimelineItem
            time="Now"
            title="In Progress"
            description="Session is currently active"
            icon={<Timer className="h-5 w-5 text-blue-500 animate-pulse" />}
          />
        )}
        {session.endedAt && (
          <TimelineItem
            time={formatDateTime(session.endedAt)}
            title="Session Ended"
            description="Research session completed"
            icon={<Timer className="h-5 w-5 text-gray-500" />}
          />
        )}
      </div>
    </section>
  );
}

function TimelineItem({ time, title, description, icon }: { time: string; title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{title}</span>
          <span className="text-sm text-muted-foreground">{time}</span>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}