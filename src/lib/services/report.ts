import { and, asc, count, desc, eq, inArray, like } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { aiRuns, evidence, hypotheses, reports, testObservations } from '@/lib/db/schema';
import {
  reportCreateSchema,
  reportListQuerySchema,
  reportUpdateSchema,
  reportStatusTransitions,
} from '@/lib/validation';
import type { ResearchAI } from '@/lib/ai/adapter';
import { REPORT_DRAFT_PROMPT_VERSION } from '@/lib/ai/prompts';
import {
  CITATION_PATTERN,
  EvidenceForCitation,
  extractReportCitations,
  generateReportMarkdown,
  HypothesisContext,
  ReportForMarkdown,
} from '@/lib/reports/markdown';

export type ResearchAIProvider = ResearchAI & { config?: { model?: string }; provider?: string };

const DRAFT_REPORT_TASK_TYPE = 'draft_report' as const;

type DrizzleDb = typeof import('@/lib/db').db;

/**
 * ReportBuilderService — Milestone 6.
 *
 * Drafts reports from CONFIRMED findings only, with evidence-referenced
 * citations, researcher-editable sections, review status, and Markdown export.
 * AI drafts are persisted as ai_runs entries with validation status so that
 * fabricated evidence references are visible in the audit trail.
 */
export class ReportBuilderService {
  private ai?: ResearchAI;
  private aiMeta?: { provider: string; model: string };
  private dbCache: DrizzleDb | null = null;
  private injectedDb?: DrizzleDb;

  // AI adapter / database can be injected for tests; defaults to global singletons.
  constructor(
    ai?: ResearchAI,
    aiMeta?: { provider: string; model: string },
    database?: DrizzleDb
  ) {
    this.ai = ai;
    this.aiMeta = aiMeta;
    this.injectedDb = database;
  }

  /** The DB singleton is resolved lazily to keep this module test-friendly. */
  private get db(): DrizzleDb {
    if (this.injectedDb) return this.injectedDb;
    if (!this.dbCache) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.dbCache = require('@/lib/db').db as DrizzleDb;
    }
    return this.dbCache;
  }

  async listReports(programId: string, query: unknown) {
    const parsed = reportListQuerySchema.parse(query);
    const { page, limit, status, hypothesisId, search, sortBy, sortOrder } = parsed;
    const offset = (page - 1) * limit;

    const conditions = [eq(reports.programId, programId)];
    if (status) conditions.push(eq(reports.reportStatus, status));
    if (hypothesisId) conditions.push(eq(reports.hypothesisId, hypothesisId));
    if (search) conditions.push(like(reports.title, `%${search}%`));
    const where = and(...conditions);

    const orderByColumn = (() => {
      switch (sortBy) {
        case 'title':
          return reports.title;
        case 'reportStatus':
          return reports.reportStatus;
        case 'updatedAt':
          return reports.updatedAt;
        default:
          return reports.createdAt;
      }
    })();

    const [data, totalResult] = await Promise.all([
      this.db
        .select()
        .from(reports)
        .where(where)
        .orderBy(sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn))
        .limit(limit)
        .offset(offset),
      this.db.select({ c: count() }).from(reports).where(where),
    ]);

    const total = totalResult[0]?.c ?? 0;
    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getReport(programId: string, reportId: string) {
    const found = (
      await this.db
        .select()
        .from(reports)
        .where(and(eq(reports.id, reportId), eq(reports.programId, programId)))
        .limit(1)
    )[0];
    return found ?? null;
  }

  async createReport(programId: string, input: unknown) {
    const validated = reportCreateSchema.parse({ ...(input as object), programId });

    // A report can only be drafted from a hypothesis that was confirmed by the
    // researcher (M6.3: "Create Draft" only for Confirmed findings).
    const hypothesis = (
      await this.db
        .select()
        .from(hypotheses)
        .where(and(eq(hypotheses.id, validated.hypothesisId), eq(hypotheses.programId, programId)))
        .limit(1)
    )[0];
    if (!hypothesis) throw new ReportError('Hypothesis not found', 404);
    if (hypothesis.status !== 'confirmed_finding') {
      throw new ReportError(
        'Reports can only be drafted from a confirmed finding (researcher-approved). Current hypothesis status: ' +
          hypothesis.status,
        409
      );
    }

    const id = randomUUID();
    await this.db.insert(reports).values({
      id,
      ...validated,
      reproductionStepsJson: JSON.stringify(validated.reproductionStepsJson),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { id, ...validated };
  }

  async updateReport(programId: string, reportId: string, input: unknown) {
    const validated = reportUpdateSchema.parse(input);

    const existing = (
      await this.db
        .select()
        .from(reports)
        .where(and(eq(reports.id, reportId), eq(reports.programId, programId)))
        .limit(1)
    )[0];
    if (!existing) throw new ReportError('Report not found', 404);

    const updateData: Record<string, unknown> = { ...validated, updatedAt: new Date() };
    if (validated.reproductionStepsJson) {
      updateData.reproductionStepsJson = JSON.stringify(validated.reproductionStepsJson);
    }

    // Status transitions are forward-only per the review workflow (M6.7).
    if (validated.reportStatus) {
      const allowed = reportStatusTransitions[existing.reportStatus] ?? [];
      if (!allowed.includes(validated.reportStatus)) {
        throw new ReportError(
          `Invalid status transition: ${existing.reportStatus} → ${validated.reportStatus}`,
          409
        );
      }
      updateData.reportStatus = validated.reportStatus;
    }

    await this.db.update(reports).set(updateData).where(eq(reports.id, reportId));
    return { id: reportId, ...validated };
  }

  async deleteReport(programId: string, reportId: string): Promise<boolean> {
    const result = await this.db
      .delete(reports)
      .where(and(eq(reports.id, reportId), eq(reports.programId, programId)));
    return result.changes > 0;
  }

  /**
   * AI-draft a report (M6.2/M6.8): calls the model with the confirmed
   * hypothesis, its supporting evidence, and recorded test observations, then
   * validates every evidence reference against actual records before saving.
   */
  async draftReportFromHypothesis(programId: string, hypothesisId: string) {
    const hypothesis = (
      await this.db
        .select()
        .from(hypotheses)
        .where(and(eq(hypotheses.id, hypothesisId), eq(hypotheses.programId, programId)))
        .limit(1)
    )[0];
    if (!hypothesis) throw new ReportError('Hypothesis not found', 404);
    if (hypothesis.status !== 'confirmed_finding') {
      throw new ReportError(
        'Reports can only be drafted from a confirmed finding (researcher-approved). Current hypothesis status: ' +
          hypothesis.status,
        409
      );
    }

    const supportingIds = safeIdArray(hypothesis.supportingEvidenceJson);
    const observationRows = await this.db
      .select()
      .from(testObservations)
      .where(eq(testObservations.hypothesisId, hypothesisId));

    // Evidence = supporting evidence + any evidence referenced by observations.
    const observationEvidenceIds = [
      ...new Set(observationRows.flatMap((o) => safeIdArray(o.evidenceIdsJson))),
    ];
    const allEvidenceIds = [...new Set([...supportingIds, ...observationEvidenceIds])];

    const evidenceRecords =
      allEvidenceIds.length > 0
        ? await this.db
            .select()
            .from(evidence)
            .where(and(inArray(evidence.id, allEvidenceIds), eq(evidence.programId, programId)))
        : [];

    const ai = this.ai ?? (await this.createProvider());
    const draft = await ai.draftReport({
      hypothesis: {
        title: hypothesis.title,
        statement: hypothesis.statement,
        category: hypothesis.category,
        testPlan: hypothesis.testPlan ?? '',
        expectedVulnerableResult: hypothesis.expectedVulnerableResult ?? '',
        expectedSafeResult: hypothesis.expectedSafeResult ?? '',
        potentialImpact: hypothesis.potentialImpact ?? 'medium',
      },
      evidence: evidenceRecords.map((e) => ({
        id: e.id,
        type: e.evidenceType,
        title: e.title,
        content: e.content,
      })),
      observations: observationRows.map((o) => ({
        testDescription: o.testDescription,
        expectedResult: o.expectedResult ?? '',
        actualResult: o.actualResult ?? '',
        conclusion: o.conclusion ?? 'inconclusive',
      })),
    });

    // Guard against fabricated evidence IDs (Architecture: "No fabricated IDs
    // allowed"). Unresolvable references are dropped, not persisted as facts.
    const validIds = new Set(evidenceRecords.map((e) => e.id));
    const clean = {
      title: draft.title,
      summary: stripUnresolvable(draft.summary, validIds),
      affectedAsset: draft.affectedAsset ? stripUnresolvable(draft.affectedAsset, validIds) : undefined,
      reproductionStepsJson: draft.reproductionSteps.map((s) => stripUnresolvable(s, validIds)),
      expectedBehavior: stripUnresolvable(draft.expectedBehavior, validIds),
      actualBehavior: stripUnresolvable(draft.actualBehavior, validIds),
      demonstratedImpact: stripUnresolvable(draft.demonstratedImpact, validIds),
      remediation: stripUnresolvable(draft.remediation, validIds),
      references: draft.references.filter((id) => validIds.has(id)),
    };
    const validationStatus = draft.references.every((id) => validIds.has(id))
      ? 'valid'
      : draft.references.some((id) => validIds.has(id))
        ? 'partial'
        : 'invalid';

    // Persist the report first; provider errors must not corrupt research state.
    const reportId = randomUUID();
    await this.persistReport(programId, hypothesisId, reportId, clean);

    await this.logAiRun(
      hypothesisId,
      evidenceRecords.map((e) => e.id),
      draft,
      validationStatus
    );

    return { id: reportId, ...clean, validationStatus };
  }

  async exportMarkdown(programId: string, reportId: string): Promise<string | null> {
    const report = await this.getReport(programId, reportId);
    if (!report) return null;

    const hypothesis = (
      await this.db.select().from(hypotheses).where(eq(hypotheses.id, report.hypothesisId)).limit(1)
    )[0];

    const citedIds = extractReportCitations(report as ReportForMarkdown);
    const evidenceById = new Map<string, EvidenceForCitation>();
    if (citedIds.length > 0) {
      const rows = await this.db
        .select()
        .from(evidence)
        .where(and(inArray(evidence.id, citedIds), eq(evidence.programId, programId)));
      for (const row of rows) {
        evidenceById.set(row.id, {
          id: row.id,
          title: row.title,
          evidenceType: row.evidenceType,
          sourceUrl: row.sourceUrl,
          content: row.content,
        });
      }
    }

    const context: HypothesisContext | undefined = hypothesis
      ? {
          statement: hypothesis.statement,
          testPlan: hypothesis.testPlan,
          prerequisitesJson: hypothesis.prerequisitesJson,
        }
      : undefined;

    return generateReportMarkdown(
      {
        title: report.title,
        summary: report.summary,
        affectedAsset: report.affectedAsset,
        preconditions: report.preconditions,
        reproductionStepsJson: report.reproductionStepsJson,
        expectedBehavior: report.expectedBehavior,
        actualBehavior: report.actualBehavior,
        demonstratedImpact: report.demonstratedImpact,
        remediation: report.remediation,
      },
      evidenceById,
      context
    );
  }

  private async persistReport(
    programId: string,
    hypothesisId: string,
    reportId: string,
    clean: {
      title: string;
      summary: string;
      affectedAsset?: string;
      reproductionStepsJson: string[];
      expectedBehavior: string;
      actualBehavior: string;
      demonstratedImpact: string;
      remediation: string;
    }
  ) {
    await this.db.insert(reports).values({
      id: reportId,
      programId,
      hypothesisId,
      title: clean.title,
      summary: clean.summary,
      affectedAsset: clean.affectedAsset,
      reproductionStepsJson: JSON.stringify(clean.reproductionStepsJson),
      expectedBehavior: clean.expectedBehavior,
      actualBehavior: clean.actualBehavior,
      demonstratedImpact: clean.demonstratedImpact,
      remediation: clean.remediation,
      reportStatus: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  private async logAiRun(
    hypothesisId: string,
    inputReferences: string[],
    output: unknown,
    validationStatus: 'valid' | 'invalid' | 'partial'
  ) {
    let provider = this.aiMeta?.provider ?? 'unknown';
    let model = this.aiMeta?.model ?? 'unknown';
    if (!this.ai) {
      const factory = await import('@/lib/ai/factory');
      const { provider: p, config } = factory.getProviderFromEnv();
      provider = p;
      model = config.model ?? 'unknown';
    }
    await this.db.insert(aiRuns).values({
      id: randomUUID(),
      taskType: DRAFT_REPORT_TASK_TYPE,
      provider,
      model,
      promptVersion: REPORT_DRAFT_PROMPT_VERSION,
      inputReferenceIdsJson: JSON.stringify([hypothesisId, ...inputReferences]),
      outputJson: JSON.stringify(output),
      validationStatus,
      createdAt: new Date(),
    });
  }

  private async createProvider(): Promise<ResearchAI> {
    const factory = await import('@/lib/ai/factory');
    const { provider, config } = factory.getProviderFromEnv();
    this.aiMeta = { provider, model: config.model ?? 'unknown' };
    return factory.createAIProvider(provider, config);
  }
}

export class ReportError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ReportError';
  }
}

function safeIdArray(json: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(json ?? '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** Remove citation syntax whose evidence id does not exist (fabricated). */
function stripUnresolvable(text: string, validIds: Set<string>): string {
  // Use the same strict pattern as the exporter so a citation that survives
  // drafting here can always be resolved at export time.
  return text.replace(CITATION_PATTERN, (match, id) => (validIds.has(id as string) ? match : ''));
}
