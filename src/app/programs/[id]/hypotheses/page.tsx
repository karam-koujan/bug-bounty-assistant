import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { programs, hypotheses, features } from "@/lib/db/schema";
import { eq, and, desc, like } from "drizzle-orm";
import Link from "next/link";
import { ChevronRight, ClipboardList, FileText, Target, Database, Lightbulb } from "lucide-react";
import { HypothesesTab } from "@/components/hypotheses/hypotheses-tab";
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

export default async function ProgramHypothesesPage({
  searchParams,
  params,
}: {
  searchParams: Promise<Record<string, string>>;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const program = await getProgram(id);
  if (!program) notFound();

  const search = query.search;
  const where = search
    ? and(eq(hypotheses.programId, id), like(hypotheses.title, `%${search}%`))
    : eq(hypotheses.programId, id);

  const [hypothesesData, featuresList] = await Promise.all([
    db.select().from(hypotheses).where(where).orderBy(desc(hypotheses.priorityScore)),
    db.select({ id: features.id, name: features.name }).from(features).where(eq(features.programId, id)),
  ]);

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
                <Lightbulb className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold">{program.name}</h1>
              </div>
              <p className="text-muted-foreground">Hypotheses</p>
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

        <HypothesesTab
          programId={program.id}
          initialHypotheses={hypothesesData}
          features={featuresList}
        />
      </div>
    </AppShell>
  );
}
