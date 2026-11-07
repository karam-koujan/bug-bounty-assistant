import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { programs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FolderKanban, Edit, Trash2, ChevronRight, ExternalLink, FileText, Target, Lightbulb, ClipboardList, Database } from "lucide-react";
import { formatDate, getStatusColor, cn } from "@/lib/utils";

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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = await getProgram(id);
  return {
    title: program ? `${program.name} - BB Research` : "Program Not Found",
  };
}

export default async function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = await getProgram(id);

  if (!program) {
    notFound();
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/programs" className="p-2 rounded hover:bg-accent">
              <ChevronRight className="h-5 w-5 rotate-180" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <FolderKanban className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold">{program.name}</h1>
                <span className={getStatusColor(program.researchStatus)} px-2 py-1 rounded-full text-xs font-medium>
                  {program.researchStatus.replace("_", " ")}
                </span>
              </div>
              <p className="text-muted-foreground">{program.platform} • {program.programUrl}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={program.programUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded hover:bg-accent" title="Open program page">
              <ExternalLink className="h-4 w-4" />
            </a>
            <Link href={`/programs/${program.id}/edit`} className="p-2 rounded hover:bg-accent" title="Edit">
              <Edit className="h-4 w-4" />
            </Link>
            <button className="p-2 rounded hover:bg-accent text-red-600" title="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
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

        {/* Overview Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Program Details</h2>
              <dl className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Platform</dt>
                    <dd className="font-medium">{program.platform}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Program URL</dt>
                    <dd className="font-medium truncate">{program.programUrl}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Research Status</dt>
                    <dd className="font-medium">
                      <span className={cn(getStatusColor(program.researchStatus), "px-2 py-1 rounded-full text-xs font-medium")}>
                        {program.researchStatus.replace("_", " ")}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Policy Reviewed</dt>
                    <dd className="font-medium">{program.policyReviewedAt ? formatDate(program.policyReviewedAt) : "Not reviewed"}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-sm text-muted-foreground">Notes</dt>
                    <dd className="font-medium whitespace-pre-wrap">{program.notes || "No notes"}</dd>
                  </div>
                </div>
              </dl>
            </section>

            {program.policyText && (
              <section className="rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">Policy</h2>
                <div className="prose max-w-none whitespace-pre-wrap text-sm">{program.policyText}</div>
              </section>
            )}

            {program.evaluationScoresJson && (
              <section className="rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">Evaluation Scores</h2>
                <EvaluationScores scores={JSON.parse(program.evaluationScoresJson)} />
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <section className="rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Link href={`/programs/${program.id}/scope`} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors">
                  <Target className="h-5 w-5" />
                  <span>Manage Scope & Rules</span>
                </Link>
                <Link href={`/programs/${program.id}/assets`} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors">
                  <Database className="h-5 w-5" />
                  <span>Manage Assets</span>
                </Link>
                <Link href={`/programs/${program.id}/features`} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors">
                  <Lightbulb className="h-5 w-5" />
                  <span>Manage Features</span>
                </Link>
                <Link href={`/programs/${program.id}/hypotheses`} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors">
                  <Lightbulb className="h-5 w-5" />
                  <span>View Hypotheses</span>
                </Link>
                <Link href={`/programs/${program.id}/evidence`} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors">
                  <FileText className="h-5 w-5" />
                  <span>View Evidence</span>
                </Link>
                <Link href={`/programs/${program.id}/sessions`} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors">
                  <ClipboardList className="h-5 w-5" />
                  <span>View Sessions</span>
                </Link>
                <Link href={`/programs/${program.id}/reports`} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors">
                  <FileText className="h-5 w-5" />
                  <span>View Reports</span>
                </Link>
              </div>
            </section>

            <section className="rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Metadata</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd className="font-medium">{formatDate(program.createdAt)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Updated</dt>
                  <dd className="font-medium">{formatDate(program.updatedAt)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">ID</dt>
                  <dd className="font-mono text-xs truncate max-w-[150px]">{program.id}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function EvaluationScores({ scores }: { scores: Record<string, number> }) {
  const dimensions = [
    { key: "attackSurfaceUsefulness", label: "Attack Surface Usefulness" },
    { key: "scopeClarity", label: "Scope Clarity" },
    { key: "rewardSuitability", label: "Reward Suitability" },
    { key: "productComplexity", label: "Product Complexity" },
    { key: "researchOpportunity", label: "Research Opportunity" },
    { key: "skillFit", label: "Skill Fit" },
  ];

  return (
    <div className="space-y-4">
      {dimensions.map((dim) => (
        <div key={dim.key} className="flex items-center gap-4">
          <div className="w-48 text-sm text-muted-foreground">{dim.label}</div>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${((scores[dim.key] ?? 0) / 5) * 100}%` }}
            />
          </div>
          <span className="w-8 text-right font-mono text-sm">
            {scores[dim.key] ?? 0}/5
          </span>
        </div>
      ))}
    </div>
  );
}