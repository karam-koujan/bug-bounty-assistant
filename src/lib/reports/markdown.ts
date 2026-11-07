/**
 * Pure helpers for Milestone 6: evidence citations and Markdown export.
 *
 * Citation syntax used in every editable report section: `[[evidence:<id>]]`
 * Citations are embedded directly in section text and are resolved at export
 * time into numbered references plus an evidence appendix.
 */

export const CITATION_PATTERN = /\[\[evidence:([a-f0-9-]{36})\]\]/g;

export interface EvidenceForCitation {
  id: string;
  title: string;
  evidenceType: string;
  sourceUrl: string | null;
  content: string;
}

export interface HypothesisContext {
  statement: string;
  testPlan: string | null;
  prerequisitesJson: string;
}

export interface ReportForMarkdown {
  title: string;
  summary: string | null;
  affectedAsset: string | null;
  preconditions: string | null;
  reproductionStepsJson: string;
  expectedBehavior: string | null;
  actualBehavior: string | null;
  demonstratedImpact: string | null;
  remediation: string | null;
}

/** Extract the deduplicated list of evidence IDs cited across a piece of text. */
export function extractEvidenceCitations(text: string | null | undefined): string[] {
  if (!text) return [];
  const ids: string[] = [];
  for (const match of text.matchAll(CITATION_PATTERN)) {
    const id = match[1];
    if (!id) continue;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** Extract citations from all searchable report fields (no DB access — pure). */
export function extractReportCitations(report: ReportForMarkdown): string[] {
  const texts = [
    report.summary,
    report.affectedAsset,
    report.preconditions,
    report.expectedBehavior,
    report.actualBehavior,
    report.demonstratedImpact,
    report.remediation,
    ...safeArray(report.reproductionStepsJson),
  ];
  const ids: string[] = [];
  for (const text of texts) {
    for (const id of extractEvidenceCitations(text)) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

function safeArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** Replace `[[evidence:ID]]` citations with numbered references like `[EV1]`. */
function replaceCitations(text: string, idOrder: string[]): string {
  const indexOf = (id: string) => idOrder.indexOf(id) + 1;
  return text.replace(CITATION_PATTERN, (_match, id: string) => `[EV${indexOf(id)}]`);
}

/**
 * Build the full Markdown export for a report. Every cited evidence gets a
 * numbered reference inline and a detailed entry in the appendix. Only evidence
 * present in `evidenceById` is listed — nothing is invented.
 */
export function generateReportMarkdown(
  report: ReportForMarkdown,
  evidenceById: Map<string, EvidenceForCitation>,
  hypothesis?: HypothesisContext
): string {
  const citedIds = extractReportCitations(report);
  const resolvable = citedIds.filter((id) => evidenceById.has(id));

  const stepList = safeArray(report.reproductionStepsJson);

  const lines: string[] = [
    `# ${report.title}`,
    '',
    '## Summary',
    '',
    replaceCitations(report.summary ?? '', resolvable) || '_Not provided._',
    '',
  ];

  if (hypothesis) {
    lines.push(
      '## Relevant Scope and Policy References',
      '',
      `> Original hypothesis statement: ${hypothesis.statement}`,
      '',
    );
  }

  if (report.affectedAsset) {
    lines.push(
      '## Affected Asset and Endpoint',
      '',
      replaceCitations(report.affectedAsset, resolvable),
      '',
    );
  }

  if (hypothesis?.testPlan || report.preconditions) {
    lines.push(
      '## Preconditions',
      '',
      replaceCitations(report.preconditions ?? hypothesis?.testPlan ?? '', resolvable),
      '',
    );
    const prerequisites = safeArray(hypothesis?.prerequisitesJson ?? '[]');
    if (prerequisites.length > 0) {
      lines.push('Prerequisites:', '', ...prerequisites.map((p) => `- ${p}`), '');
    }
  }

  lines.push(
    '## Steps to Reproduce',
    '',
    ...(stepList.length > 0
      ? stepList.map((step, i) => `${i + 1}. ${replaceCitations(step, resolvable)}`)
      : ['_No reproduction steps recorded._']),
    '',
    '## Expected Behavior',
    '',
    replaceCitations(report.expectedBehavior ?? '', resolvable) || '_Not provided._',
    '',
    '## Actual Behavior',
    '',
    replaceCitations(report.actualBehavior ?? '', resolvable) || '_Not provided._',
    '',
    '## Demonstrated Impact',
    '',
    replaceCitations(report.demonstratedImpact ?? '', resolvable) || '_Not provided._',
    '',
    '## Suggested Remediation',
    '',
    replaceCitations(report.remediation ?? '', resolvable) || '_Not provided._',
    '',
  );

  if (resolvable.length > 0) {
    lines.push('## Evidence Appendix', '');
    resolvable.forEach((id, index) => {
      const ev = evidenceById.get(id);
      if (!ev) return;
      const source = ev.sourceUrl ? ` — source: ${ev.sourceUrl}` : '';
      lines.push(
        `### EV${index + 1}: ${ev.title}`,
        '',
        `- Type: ${ev.evidenceType}${source}`,
        `- Evidence ID: ${ev.id}`,
        '',
        ev.content,
        '',
      );
    });
  }

  // Never leave raw citation syntax in the portable export.
  return lines.join('\n').replace(/\[\[evidence:[^\]]*\]\]/g, '');
}
