import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { programs } from "@/lib/db/schema";
import { eq, desc, asc, like, and, count } from "drizzle-orm";
import Link from "next/link";
import { Plus, Edit, Trash2, FolderKanban } from "lucide-react";
import { programListQuerySchema } from "@/lib/validation";
import { formatDate, getStatusColor, calculateProgramScore, cn } from "@/lib/utils";
import { ProgramFilters } from "@/components/programs/program-filters";

async function getPrograms(searchParams: Record<string, string>) {
  const query = programListQuerySchema.parse(searchParams);
  const { page, limit, status, platform, search, sortBy, sortOrder } = query;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (status) conditions.push(eq(programs.researchStatus, status));
  if (platform) conditions.push(eq(programs.platform, platform));
  if (search) conditions.push(like(programs.name, `%${search}%`));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totalResult] = await Promise.all([
    db.select().from(programs).where(whereClause).orderBy(
      sortOrder === "asc" ? asc(programs[sortBy]) : desc(programs[sortBy])
    ).limit(limit).offset(offset),
    db.select({ count: count() }).from(programs).where(whereClause),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return { data, total, page, limit, totalPages };
}

export default async function ProgramsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const { data: programsList, total, page, limit, totalPages } = await getPrograms(params);

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "inbox", label: "Inbox" },
    { value: "evaluating", label: "Evaluating" },
    { value: "ready_to_investigate", label: "Ready to Investigate" },
    { value: "active_research", label: "Active Research" },
    { value: "paused", label: "Paused" },
    { value: "archived", label: "Archived" },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Programs</h1>
            <p className="text-muted-foreground">Manage your bug bounty programs</p>
          </div>
          <Link href="/programs/new" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            New Program
          </Link>
        </div>

        {/* Filters */}
        <ProgramFilters />

        {/* Programs Table */}
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Program</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Platform</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Score</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Updated</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {programsList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No programs found. <Link href="/programs/new" className="text-primary underline">Create your first program</Link>
                  </td>
                </tr>
              ) : (
                programsList.map((program) => {
                  const scores = JSON.parse(program.evaluationScoresJson || "{}");
                  const { total } = calculateProgramScore(scores);
                  return (
                    <tr key={program.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/programs/${program.id}`} className="flex items-center gap-3">
                          <FolderKanban className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{program.name}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">{program.programUrl}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">{program.platform}</td>
                      <td className="px-4 py-3">
                        <span className={cn(getStatusColor(program.researchStatus), "px-2 py-1 rounded-full text-xs font-medium")}>
                        {program.researchStatus.replace("_", " ")}
                      </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-lg">{total.toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(program.updatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/programs/${program.id}`} className="p-2 rounded hover:bg-accent" title="View">
                            <FolderKanban className="h-4 w-4" />
                          </Link>
                          <Link href={`/programs/${program.id}/edit`} className="p-2 rounded hover:bg-accent" title="Edit">
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button className="p-2 rounded hover:bg-accent text-red-600" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set("page", String(page - 1));
                    window.location.href = url.toString();
                  }}
                  className="px-3 py-1 rounded border disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set("page", String(page + 1));
                    window.location.href = url.toString();
                  }}
                  className="px-3 py-1 rounded border disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}