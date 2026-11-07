import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  const iso = d.toISOString();
  const parts = iso.split('T');
  return parts[0] ?? 'Invalid Date';
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  const iso = d.toISOString();
  return iso.replace('T', ' ').substring(0, 16);
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function calculateProgramScore(scores: Record<string, number>): { total: number; breakdown: Record<string, number> } {
  const weights = {
    attackSurfaceUsefulness: 1,
    scopeClarity: 1,
    rewardSuitability: 1,
    productComplexity: 1,
    researchOpportunity: 1,
    skillFit: 1,
  };

  const breakdown: Record<string, number> = {};
  let total = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const value = scores[key] ?? 0;
    breakdown[key] = value * weight;
    total += breakdown[key];
  }

  return { total, breakdown };
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    inbox: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    evaluating: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    ready_to_investigate: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    active_research: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    archived: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    needs_evidence: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    ready_for_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    approved_for_testing: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    testing_in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    supported_by_evidence: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    disproved_by_test: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    inconclusive: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    confirmed_finding: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    in_scope: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    out_of_scope: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    unknown: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    untested: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    testing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    tested_vulnerable: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    tested_secure: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    blocked: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    unverified: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    verified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    disputed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    draft_report: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    in_review: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    submitted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };
  return colors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
}