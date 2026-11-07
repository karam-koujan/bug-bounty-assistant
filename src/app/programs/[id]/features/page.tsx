import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { programs, assets, features } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Lightbulb, FileText, Target, Database, ClipboardList } from "lucide-react";
import { formatDate, getStatusColor } from "@/lib/utils";
import { FeaturesTab } from "@/components/features/features-tab";

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

async function getFeatures(programId: string) {
  return db.select().from(features).where(eq(features.programId, programId)).orderBy(features.name);
}

async function getAssets(programId: string) {
  return db.select({ id: assets.id, assetIdentifier: assets.assetIdentifier }).from(assets).where(eq(assets.programId, programId));
}

export default async function ProgramFeaturesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = await getProgram(id);
  const featuresList = await getFeatures(id);
  const assetsList = await getAssets(id);

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
                <Lightbulb className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold">{program.name}</h1>
              </div>
              <p className="text-muted-foreground">Features</p>
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

        <FeaturesTab programId={program.id} initialFeatures={featuresList} initialAssets={assetsList} />
      </div>
    </AppShell>
  );
}