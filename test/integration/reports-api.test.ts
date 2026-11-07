import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { randomUUID } from 'crypto';
import { createTestDb, createTestProgram, createTestEvidence, createTestFeature } from '../utils/test-db';
import { hypotheses, testObservations, aiRuns, researchSessions } from '@/lib/db/schema';
import { ReportBuilderService, ReportError } from '@/lib/services/report';
import type { ResearchAI } from '@/lib/ai/adapter';

let testDb: ReturnType<typeof createTestDb>;
let programId: string;
let featureId: string;
let evidenceId: string;

function createHypothesis(status = 'confirmed_finding') {
  const id = randomUUID();
  testDb.db
    .insert(hypotheses)
    .values({
      id,
      programId,
      featureId,
      title: 'Project retrieval may lack organization membership check',
      statement: 'The API might check authentication but fail to enforce project-level organization membership.',
      category: 'authorization',
      supportingEvidenceJson: JSON.stringify([evidenceId]),
      contradictingEvidenceJson: '[]',
      assumptionsJson: '[]',
      prerequisitesJson: JSON.stringify(['Two researcher-controlled accounts']),
      testPlan: 'Compare access between two controlled accounts.',
      expectedVulnerableResult: 'Cross-account data access.',
      expectedSafeResult: '403 rejection.',
      potentialImpact: 'high',
      status,
      priorityScore: 7,
      priorityBreakdownJson: '{}',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .run();
  return id;
}

function createObservation(hypothesisId: string) {
  const sessionId = randomUUID();
  testDb.db
    .insert(researchSessions)
    .values({
      id: sessionId,
      programId,
      hypothesisId,
      objective: 'Test authorization bypass',
      nextStepsJson: '[]',
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .run();
  const id = randomUUID();
  testDb.db
    .insert(testObservations)
    .values({
      id,
      programId,
      sessionId,
      hypothesisId,
      testDescription: 'Compared access with two accounts.',
      expectedResult: '403 rejection',
      actualResult: 'Project data returned',
      evidenceIdsJson: JSON.stringify([evidenceId]),
      conclusion: 'supported_by_evidence',
      createdAt: new Date(),
    })
    .run();
  return id;
}

function makeMockAI(calls: unknown[] = []): ResearchAI {
  return {
    evaluateProgram: async () => {
      throw new Error('not used');
    },
    analyzeFeature: async () => {
      throw new Error('not used');
    },
    generateHypotheses: async () => {
      throw new Error('not used');
    },
    analyzeObservation: async () => {
      throw new Error('not used');
    },
    researchAdvisory: async () => {
      throw new Error('not used');
    },
    generateSessionSummary: async () => {
      throw new Error('not used');
    },
    draftReport: async (input) => {
      calls.push(input);
      return {
        title: 'Confirmed access-control failure on project endpoint',
        summary: `Observed failure. [[evidence:${evidenceId}]]`,
        affectedAsset: 'api.example.com — GET /api/v1/projects/:id',
        reproductionSteps: [
          'Authenticate as account A.',
          `Request project of account B [[evidence:${evidenceId}]]`,
        ],
        expectedBehavior: '403 response',
        actualBehavior: '200 with project data',
        demonstratedImpact: 'Cross-account data access demonstrated.',
        remediation: 'Enforce organization membership server-side.',
        references: [evidenceId],
        confidence: 0.85,
      };
    },
  } as ResearchAI;
}

beforeEach(() => {
  testDb = createTestDb();
  programId = createTestProgram(testDb.db).id;
  featureId = createTestFeature(testDb.db, programId).id;
  evidenceId = createTestEvidence(testDb.db, programId, {
    title: 'Observed HTTP response',
    content: 'HTTP/1.1 200 OK — project data returned for cross-account request.',
  }).id;
});

afterEach(() => {
  testDb.sqlite.close();
});

describe('ReportBuilderService — full report flow (M6.10)', () => {
  it('draft + persist + edit + export Markdown + status transitions', async () => {
    const hypothesisId = createHypothesis();
    createObservation(hypothesisId);
    const calls: unknown[] = [];
    const service = new ReportBuilderService(makeMockAI(calls), { provider: 'mock', model: 'mock-1' }, testDb.db);

    // 1. AI draft from confirmed finding
    const draft = await service.draftReportFromHypothesis(programId, hypothesisId);
    expect(calls).toHaveLength(1);
    expect(draft.validationStatus).toBe('valid');

    const persisted = await service.getReport(programId, draft.id);
    expect(persisted?.reportStatus).toBe('draft');
    expect(persisted?.affectedAsset).toContain('api.example.com');

    // 2. ai_runs audit entry recorded with versioned prompt
    const runs = testDb.db.select().from(aiRuns).all();
    expect(runs).toHaveLength(1);
    expect(runs[0]?.taskType).toBe('draft_report');
    expect(runs[0]?.promptVersion).toMatch(/^\d+\.\d+$/);
    expect(runs[0]?.validationStatus).toBe('valid');

    // 3. Human review — editable sections
    await service.updateReport(programId, draft.id, {
      title: 'Updated title after review',
      demonstratedImpact: 'Impact confirmed by researcher.',
    });
    const edited = await service.getReport(programId, draft.id);
    expect(edited?.title).toBe('Updated title after review');

    // 4. Status workflow draft → in_review → approved → submitted (forward-only)
    await service.updateReport(programId, draft.id, { reportStatus: 'in_review' });
    expect((await service.getReport(programId, draft.id))?.reportStatus).toBe('in_review');
    await expect(service.updateReport(programId, draft.id, { reportStatus: 'draft' })).rejects.toBeInstanceOf(ReportError);

    // 5. Markdown export with citations resolved out of existing evidence only
    const markdown = (await service.exportMarkdown(programId, draft.id)) ?? '';
    expect(markdown).toContain('# Updated title after review');
    expect(markdown).toContain('[EV1]');
    expect(markdown).not.toContain('[[evidence:');
    expect(markdown).toContain('EV1: Observed HTTP response');
    // no invented content: the mock draft reuses only the mock response, which is fixed above
  });

  it('rejects drafting unless hypothesis status is confirmed_finding', async () => {
    const draftId = createHypothesis('testing_in_progress');
    const service = new ReportBuilderService(makeMockAI(), { provider: 'mock', model: 'mock-1' }, testDb.db);
    await expect(service.draftReportFromHypothesis(programId, draftId)).rejects.toMatchObject({
      status: 409,
    } as Partial<ReportError>);
    const created = await service.listReports(programId, {});
    expect(created.data).toHaveLength(0);
  });

  it('strips fabricated evidence references invented by the model', async () => {
    const hypothesisId = createHypothesis();
    const service = new ReportBuilderService(
      Object.assign(makeMockAI(), {
        draftReport: async () => ({
          title: 'T',
          summary: 'Claim referencing a fake record [[evidence:99999999-9999-4999-8999-999999999999]]',
          reproductionSteps: ['Step with fake ref [[evidence:99999999-9999-4999-8999-999999999999]]'],
          expectedBehavior: 'e',
          actualBehavior: 'a',
          demonstratedImpact: 'i',
          remediation: 'r',
          references: [evidenceId, '99999999-9999-4999-8999-999999999999'],
          confidence: 0.9,
        }),
      }) as ResearchAI,
      { provider: 'mock', model: 'mock-1' },
      testDb.db
    );

    const draft = await service.draftReportFromHypothesis(programId, hypothesisId);
    // fabricated ID dropped and stripped from text (traceable to real evidence only)
    expect(draft.references).toEqual([evidenceId]);
    expect(draft.summary).not.toContain('99999999');
    expect(draft.validationStatus).toBe('partial');
    const run = testDb.db.select().from(aiRuns).all()[0];
    expect(run?.validationStatus).toBe('partial');
  });

  it('marks a fully fabricated draft as invalid in the audit trail', async () => {
    const hypothesisId = createHypothesis();
    const service = new ReportBuilderService(
      Object.assign(makeMockAI(), {
        draftReport: async () => ({
          title: 'T',
          summary: 'Fake [[evidence:88888888-8888-4888-a888-888888888888]]',
          reproductionSteps: [],
          expectedBehavior: 'e',
          actualBehavior: 'a',
          demonstratedImpact: 'i',
          remediation: 'r',
          references: ['88888888-8888-4888-a888-888888888888', '99999999-9999-4999-8999-999999999999'],
          confidence: 0.9,
        }),
      }) as ResearchAI,
      { provider: 'mock', model: 'mock-1' },
      testDb.db
    );
    const draft = await service.draftReportFromHypothesis(programId, hypothesisId);
    expect(draft.references).toEqual([]);
    expect(draft.validationStatus).toBe('invalid');
    expect(testDb.db.select().from(aiRuns).all()[0]?.validationStatus).toBe('invalid');
  });

  it('rejects a fabricated UUID in manual creation via Zod validation', async () => {
    const service = new ReportBuilderService(undefined, undefined, testDb.db);
    await expect(
      service.createReport(programId, { hypothesisId: 'not-a-uuid', title: 'T' })
    ).rejects.toThrow();
  });

  it('formats reproduction steps and round-trips them through the editor API shape', async () => {
    const hypothesisId = createHypothesis();
    const service = new ReportBuilderService(makeMockAI(), { provider: 'mock', model: 'mock-1' }, testDb.db);
    const { id } = await service.draftReportFromHypothesis(programId, hypothesisId);
    await service.updateReport(programId, id, {
      reproductionStepsJson: ['Step one', 'Step two'],
    });
    const report = await service.getReport(programId, id);
    expect(JSON.parse(report?.reproductionStepsJson ?? '[]')).toEqual(['Step one', 'Step two']);
    const md = (await service.exportMarkdown(programId, id)) ?? '';
    expect(md).toContain('1. Step one');
    expect(md).toContain('2. Step two');
  });

  it('deletes only within the owning program (cross-program isolation)', async () => {
    const hypothesisId = createHypothesis();
    const service = new ReportBuilderService(makeMockAI(), { provider: 'mock', model: 'mock-1' }, testDb.db);
    const { id } = await service.draftReportFromHypothesis(programId, hypothesisId);

    const otherProgram = createTestProgram(testDb.db).id;
    expect(await service.getReport(otherProgram, id)).toBeNull();
    expect(await service.deleteReport(otherProgram, id)).toBe(false);
    expect(await service.getReport(programId, id)).not.toBeNull();
  });
});
