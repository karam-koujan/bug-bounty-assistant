import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { programs, evidence } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Target, FileText, Lightbulb, ClipboardList, Database } from "lucide-react";
import { formatDate, getStatusColor } from "@/lib/utils";
import { EvidenceTab } from "@/components/evidence/evidence-tab";

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

async function getEvidence(programId: string) {
  return db.select().from(evidence).where(eq(evidence.programId, programId)).orderBy(desc(evidence.collectedAt)).limit(50);
}

export default async function ProgramEvidencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = await getProgram(id);
  const evidenceList = await getEvidence(id);

  if (!program) {
    notFound();
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/programs/${program.id}`} className="p-2 rounded hover:bg-accent">
              <ChevronRight className="h-5 w-5 rotate-180" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold">{program.name}</h1>
              </div>
              <p className="text-muted-foreground">Evidence</p>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
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

        <EvidenceTab programId={program.id} initialEvidence={evidenceList} />
      </div>
    </AppShell>
  );
}