import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { programs, researchSessions, assets, hypotheses, evidence } from "@/lib/db/schema";
import { eq, and, desc, count, like, asc } from "drizzle-orm";
import Link from "next/link";
import { Plus, ChevronRight, ClipboardList, FileText, Target, Lightbulb, Database } from "lucide-react";
import { formatDateTime, getStatusColor } from "@/lib/utils";
import { SessionsTab } from "@/components/sessions/sessions-tab";
import { notFound } from "next/navigation";

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

async function getSessions(programId: string, searchParams: Record<string, string>) {
  const { page = "1", limit = "20", hypothesisId, search, sortBy = "startedAt", sortOrder = "desc" } = searchParams;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(researchSessions.programId, programId)];
  if (hypothesisId) conditions.push(eq(researchSessions.hypothesisId, hypothesisId));
  if (search) conditions.push(like(researchSessions.objective, `%${search}%`));

  const whereClause = and(...conditions);

  const orderByColumn = (() => {
    switch (sortBy) {
      case "objective": return researchSessions.objective;
      case "startedAt": return researchSessions.startedAt;
      default: return researchSessions.startedAt;
    }
  })();

  const [data, totalResult] = await Promise.all([
    db.select().from(researchSessions).where(whereClause).orderBy(
      sortOrder === "asc" ? asc(orderByColumn) : desc(orderByColumn)
    ).limit(limitNum).offset(offset),
    db.select({ count: count() }).from(researchSessions).where(whereClause),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limitNum);

  return { data, total, page: pageNum, limit: limitNum, totalPages };
}

async function getAssets(programId: string) {
  return db.select({ id: assets.id, assetIdentifier: assets.assetIdentifier }).from(assets).where(eq(assets.programId, programId));
}

async function getHypotheses(programId: string) {
  return db.select({ id: hypotheses.id, title: hypotheses.title }).from(hypotheses).where(eq(hypotheses.programId, programId));
}

export default async function ProgramSessionsPage({ searchParams, params }: { searchParams: Promise<Record<string, string>>; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const params_ = await searchParams;
  const program = await getProgram(id);
  const sessionsData = await getSessions(id, params_);
  const assetsList = await getAssets(id);
  const hypothesesList = await getHypotheses(id);

  if (!program) {
    notFound();
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/programs/${program.id}`} className="p-2 rounded hover:bg-accent">
              <ChevronRight className="h-5 w-5 rotate-180" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold">{program.name}</h1>
              </div>
              <p className="text-muted-foreground">Sessions</p>
            </div>
          </div>
        </div>

        <nav className="flex gap-1 p-1 rounded-lg bg-muted/50" aria-label="Program tabs">
          {tabs.map((tab) => (
            <Link
              key={tab.name}
              href={`/programs/${program.id}/${tab.href}`}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </Link>
          ))}
        </nav>

        <SessionsTab
          programId={program.id}
          initialSessions={sessionsData.data}
          initialHypotheses={hypothesesList}
        />
      </div>
    </AppShell>
  );
}