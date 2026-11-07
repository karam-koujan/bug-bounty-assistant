import { AppShell } from "@/components/app-shell";
import { ProgramForm } from "@/components/programs/program-form";

export default function NewProgramPage() {
  return (
    <AppShell>
      <ProgramForm mode="create" />
    </AppShell>
  );
}