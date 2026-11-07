import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { programs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ProgramForm } from "@/components/programs/program-form";

interface ProgramData {
  id: string;
  name: string;
  platform: string;
  programUrl: string;
  policyText: string | null;
  policyReviewedAt: Date | null;
  researchStatus: "inbox" | "evaluating" | "ready_to_investigate" | "active_research" | "paused" | "archived";
  evaluationScoresJson: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

async function getProgram(id: string) {
  const program = await db.select().from(programs).where(eq(programs.id, id)).limit(1);
  return program[0];
}

export default async function EditProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = await getProgram(id);

  if (!program) {
    notFound();
  }

  // Transform DB nulls to undefined for form compatibility
  const formData = {
    ...program,
    policyText: program.policyText ?? undefined,
    policyReviewedAt: program.policyReviewedAt ? program.policyReviewedAt.toISOString() : undefined,
    evaluationScoresJson: JSON.parse(program.evaluationScoresJson || "{}"),
    notes: program.notes ?? undefined,
  };

  return (
    <AppShell>
      <ProgramForm mode="edit" initialData={formData} />
    </AppShell>
  );
}