import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { programs, hypotheses, researchSessions, evidence } from "@/lib/db/schema";
import { eq, desc, count, sql } from "drizzle-orm";
import Link from "next/link";
import { FolderKanban, Lightbulb, ClipboardList, FileText, Plus, ArrowRight, TrendingUp } from "lucide-react";
import { formatDate, getStatusColor } from "@/lib/utils";

async function getDashboardStats() {
  const [
    programsCount,
    activePrograms,
    hypothesesCount,
    activeHypotheses,
    recentSessions,
    recentEvidence,
  ] = await Promise.all([
    db.select({ count: count() }).from(programs),
    db.select().from(programs).where(eq(programs.researchStatus, "active_research")).limit(5),
    db.select({ count: count() }).from(hypotheses),
    db.select().from(hypotheses).where(eq(hypotheses.status, "approved_for_testing")).limit(5),
    db.select().from(researchSessions).orderBy(desc(researchSessions.startedAt)).limit(5),
    db.select().from(evidence).orderBy(desc(evidence.collectedAt)).limit(5),
  ]);

  return {
    programsCount: programsCount[0]?.count ?? 0,
    activePrograms,
    hypothesesCount: hypothesesCount[0]?.count ?? 0,
    activeHypotheses,
    recentSessions,
    recentEvidence,
  };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your bug bounty research</p>
          </div>
          <Link href="/programs/new" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            New Program
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Programs"
            value={stats.programsCount}
            icon={FolderKanban}
            href="/programs"
          />
          <StatCard
            title="Active Programs"
            value={stats.activePrograms.length}
            icon={TrendingUp}
            href="/programs?status=active_research"
          />
          <StatCard
            title="Total Hypotheses"
            value={stats.hypothesesCount}
            icon={Lightbulb}
            href="/hypotheses"
          />
          <StatCard
            title="Ready for Testing"
            value={stats.activeHypotheses.length}
            icon={ClipboardList}
            href="/hypotheses?status=approved_for_testing"
          />
        </div>

        {/* Active Programs & Ready for Testing */}
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Active Programs" href="/programs?status=active_research">
            {stats.activePrograms.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No active programs. <Link href="/programs/new" className="text-primary underline">Create one</Link></p>
            ) : (
              <ul className="space-y-3">
                {stats.activePrograms.map((program) => (
                  <li key={program.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                    <Link href={`/programs/${program.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <FolderKanban className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{program.name}</p>
                        <p className="text-sm text-muted-foreground">{program.platform}</p>
                      </div>
                    </Link>
                    <span className={getStatusColor(program.researchStatus)}>Active</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Ready for Testing" href="/hypotheses?status=approved_for_testing">
            {stats.activeHypotheses.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hypotheses ready for testing</p>
            ) : (
              <ul className="space-y-3">
                {stats.activeHypotheses.map((hypothesis) => (
                  <li key={hypothesis.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                    <Link href={`/hypotheses/${hypothesis.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{hypothesis.title}</p>
                        <p className="text-sm text-muted-foreground">{hypothesis.category}</p>
                      </div>
                    </Link>
                    <span className={getStatusColor(hypothesis.status)}>Ready</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Recent Sessions & Evidence */}
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Recent Sessions" href="/sessions">
            {stats.recentSessions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No recent sessions</p>
            ) : (
              <ul className="space-y-3">
                {stats.recentSessions.map((session) => (
                  <li key={session.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                    <Link href={`/sessions/${session.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <ClipboardList className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{session.objective}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(session.startedAt)}</p>
                      </div>
                    </Link>
                    {session.endedAt ? (
                      <span className="text-sm text-muted-foreground">Completed</span>
                    ) : (
                      <span className="text-sm text-green-600 dark:text-green-400">In Progress</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Recent Evidence" href="/evidence">
            {stats.recentEvidence.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No evidence recorded yet</p>
            ) : (
              <ul className="space-y-3">
                {stats.recentEvidence.map((ev) => (
                  <li key={ev.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                    <Link href={`/evidence/${ev.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{ev.title}</p>
                        <p className="text-sm text-muted-foreground">{ev.evidenceType.replace("_", " ")}</p>
                      </div>
                    </Link>
                    <span className={getStatusColor(ev.verificationStatus)}>{ev.verificationStatus}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ title, value, icon: Icon, href }: { title: string; value: number; icon: React.ComponentType<{ className?: string }>; href: string }) {
  return (
    <Link href={href} className="p-4 rounded-lg border hover:bg-accent transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div className="p-3 rounded-full bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Link>
  );
}

function SectionCard({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link href={href} className="text-sm text-primary hover:underline flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}