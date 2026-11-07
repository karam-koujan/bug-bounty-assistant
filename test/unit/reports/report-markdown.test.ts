import { describe, it, expect } from 'vitest';
import {
  generateReportMarkdown,
  extractEvidenceCitations,
  extractReportCitations,
  EvidenceForCitation,
} from '@/lib/reports/markdown';
import { ReportDraftSchema } from '@/lib/ai/schemas';
import { REPORT_DRAFT_PROMPT_VERSION } from '@/lib/ai/prompts';

function makeEvidence(overrides: Partial<EvidenceForCitation> = {}): EvidenceForCitation {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Recorded HTTP response',
    evidenceType: 'http_response',
    sourceUrl: null,
    content: 'HTTP/1.1 200 OK — observed response body from the researcher test.',
    ...overrides,
  };
}

function makeReport(overrides = {}) {
  return {
    title: 'Broken organization access control on project endpoint',
    summary: 'The endpoint may not enforce organization membership. [[evidence:11111111-1111-4111-8111-111111111111]]',
    affectedAsset: 'api.example.com — GET /api/v1/projects/:id',
    preconditions: 'Two researcher-controlled accounts are required.',
    reproductionStepsJson: JSON.stringify([
      'Authenticate as account A.',
      'Request a project of account B. [[evidence:11111111-1111-4111-8111-111111111111]]',
    ]),
    expectedBehavior: 'Request should be rejected with 403.',
    actualBehavior: 'Request returned the project data. [[evidence:11111111-1111-4111-8111-111111111111]]',
    demonstratedImpact: 'Cross-account data access demonstrated during testing.',
    remediation: 'Enforce organization membership server-side.',
    ...overrides,
  };
}

describe('extractEvidenceCitations', () => {
  it('extracts unique cited ids', () => {
    const text = 'a [[evidence:11111111-1111-4111-8111-111111111111]] b [[evidence:11111111-1111-4111-8111-111111111111]]';
    expect(extractEvidenceCitations(text)).toHaveLength(1);
  });

  it('handles null text safely', () => {
    expect(extractEvidenceCitations(null)).toEqual([]);
  });
});

describe('extractReportCitations', () => {
  it('collects ids from all report fields', () => {
    const ids = extractReportCitations(makeReport());
    expect(ids).toEqual(['11111111-1111-4111-8111-111111111111']);
  });
});

describe('generateReportMarkdown', () => {
  it('contains all report sections in order', () => {
    const md = generateReportMarkdown(makeReport(), new Map([['11111111-1111-4111-8111-111111111111', makeEvidence()]]));
    expect(md).toContain('# Broken organization access control on project endpoint');
    expect(md).toContain('## Summary');
    expect(md).toContain('## Affected Asset and Endpoint');
    expect(md).toContain('## Preconditions');
    expect(md).toContain('## Steps to Reproduce');
    expect(md).toContain('1. Authenticate as account A.');
    expect(md).toContain('## Expected Behavior');
    expect(md).toContain('## Actual Behavior');
    expect(md).toContain('## Demonstrated Impact');
    expect(md).toContain('## Suggested Remediation');
    expect(md).toContain('## Evidence Appendix');
  });

  it('replaces citations with numbered references and lists evidence in appendix', () => {
    const md = generateReportMarkdown(makeReport(), new Map([['11111111-1111-4111-8111-111111111111', makeEvidence()]]));
    expect(md).toContain('[EV1]');
    expect(md).not.toContain('[[evidence:');
    expect(md).toContain('EV1: Recorded HTTP response');
    expect(md).toContain('HTTP/1.1 200 OK');
    expect(md).toContain('Evidence ID: 11111111-1111-4111-8111-111111111111');
  });

  it('never invents evidence: uncited ids are dropped from the appendix', () => {
    const md = generateReportMarkdown(
      makeReport(),
      new Map([['11111111-1111-4111-8111-111111111111', makeEvidence()]])
    );
    expect(md).not.toContain('EV2');
    expect(md).not.toContain('99999999');
  });

  it('drops citations to unknown evidence from section text too', () => {
    const unknownReport = { ...makeReport(), summary: 'Claim [[evidence:99999999-9999-4999-8999-999999999999]]' };
    const md = generateReportMarkdown(unknownReport, new Map([['11111111-1111-4111-8111-111111111111', makeEvidence()]]));
    expect(md).not.toContain('[[evidence:');
    // bracketed TODO placeholders must survive — they mark missing data
    const todoReport = { ...makeReport(), demonstratedImpact: '[TODO: confirm impact]' };
    expect(generateReportMarkdown(todoReport, new Map())).toContain('[TODO: confirm impact]');
  });

  it('falls back to placeholders for empty sections instead of invented text', () => {
    const empty = {
      title: 'T',
      summary: null,
      affectedAsset: null,
      preconditions: null,
      reproductionStepsJson: '[]',
      expectedBehavior: null,
      actualBehavior: null,
      demonstratedImpact: null,
      remediation: null,
    };
    const md = generateReportMarkdown(empty, new Map());
    expect(md).toContain('_No reproduction steps recorded._');
    expect(md).not.toContain('1. ');
  });

  it('includes hypothesis context (prerequisites + scope references)', () => {
    const md = generateReportMarkdown(
      makeReport(),
      new Map([['11111111-1111-4111-8111-111111111111', makeEvidence()]]),
      {
        statement: 'The API might check auth but not organization membership.',
        testPlan: 'Two-account comparison.',
        prerequisitesJson: JSON.stringify(['Two controlled accounts']),
      }
    );
    expect(md).toContain('## Relevant Scope and Policy References');
    expect(md).toContain('The API might check auth but not organization membership.');
    expect(md).toContain('- Two controlled accounts');
  });
});

describe('report prompt safety (M6.8)', () => {
  it('accepts a structured draft with evidence references', () => {
    const parsed = ReportDraftSchema.parse({
      title: 'T',
      summary: 'S',
      reproductionSteps: ['x'],
      expectedBehavior: 'e',
      actualBehavior: 'a',
      demonstratedImpact: 'i',
      remediation: 'r',
      references: ['11111111-1111-4111-8111-111111111111'],
      confidence: 0.9,
    });
    expect(parsed.references).toHaveLength(1);
  });

  it('rejects non-UUID fabricated evidence references', () => {
    expect(() =>
      ReportDraftSchema.parse({
        title: 'T',
        summary: 'S',
        reproductionSteps: [],
        expectedBehavior: 'e',
        actualBehavior: 'a',
        demonstratedImpact: 'i',
        remediation: 'r',
        references: ['not-a-uuid'],
        confidence: 0.9,
      })
    ).toThrow();
  });

  it('uses a versioned prompt for ai_runs auditing', () => {
    expect(REPORT_DRAFT_PROMPT_VERSION).toMatch(/^\d+\.\d+$/);
  });
});
