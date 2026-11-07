import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { GenericOpenAICompatibleProvider } from '@/lib/ai/providers/generic';
import { ProgramEvaluationSchema, FeatureAnalysisSchema, HypothesisSchema, ObservationAnalysisSchema, AdvisoryAnalysisSchema, SessionSummarySchema, ReportDraftSchema } from '@/lib/ai/schemas';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GenericOpenAICompatibleProvider', () => {
  let provider: GenericOpenAICompatibleProvider;

  beforeEach(() => {
    vi.resetAllMocks();
    provider = new GenericOpenAICompatibleProvider({
      baseUrl: 'http://localhost:11434/v1',
      apiKey: 'test-key',
      model: 'llama3.2',
    });
  });

  const mockSuccessResponse = (content: unknown) => ({
    ok: true,
    json: vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(content) }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
    }),
  });

  describe('evaluateProgram', () => {
    it('returns valid ProgramEvaluation', async () => {
      const mockResult = {
        programName: 'Test Program',
        platform: 'HackerOne',
        scores: {
          attackSurfaceUsefulness: 4,
          scopeClarity: 3,
          rewardSuitability: 5,
          productComplexity: 2,
          researchOpportunity: 4,
          skillFit: 3,
        },
        reasoning: 'Good attack surface with clear scope',
        confidence: 0.85,
      };
      mockFetch.mockResolvedValue(mockSuccessResponse(mockResult));

      const result = await provider.evaluateProgram({
        program: { name: 'Test Program', platform: 'HackerOne', policyText: 'Policy text', programUrl: 'https://example.com' },
        evidence: [{ id: 'ev-1', type: 'program_policy', title: 'Policy', content: 'Policy content' }],
      });

      expect(result.programName).toBe('Test Program');
      expect(result.scores.attackSurfaceUsefulness).toBe(4);
      expect(result.confidence).toBe(0.85);
    });
  });

  describe('analyzeFeature', () => {
    it('returns valid FeatureAnalysis', async () => {
      const mockResult = {
        featureName: 'User Auth',
        summary: 'Authentication feature',
        attackSurface: ['SQL injection', 'Brute force'],
        securityGaps: ['No rate limiting'],
        testIdeas: ['Test login with SQLi', 'Test password reset'],
        confidence: 0.9,
      };
      mockFetch.mockResolvedValue(mockSuccessResponse(mockResult));

      const result = await provider.analyzeFeature({
        feature: { name: 'User Auth', description: 'Auth feature', roles: ['user'], resourceTypes: ['user'], securityProperties: ['auth'] },
        endpoints: [{ method: 'POST', path: '/login', auth: 'none' }],
        evidence: [],
      });

      expect(result.featureName).toBe('User Auth');
      expect(result.attackSurface).toContain('SQL injection');
    });
  });

  describe('generateHypotheses', () => {
    it('returns array of Hypothesis', async () => {
      const mockResult = [{
        title: 'IDOR on User Profile',
        statement: 'User ID not validated in profile endpoint',
        category: 'authorization',
        supportingEvidenceIds: ['ev-1'],
        contradictingEvidenceIds: [],
        assumptions: ['User controls profile ID parameter'],
        prerequisites: ['Two test accounts'],
        testPlan: '1. Login as user A. 2. Access profile of user B.',
        expectedVulnerableResult: 'Returns user B profile data',
        expectedSafeResult: 'Returns 403 Forbidden',
        potentialImpact: 'high',
        priorityScore: 7.5,
        confidence: 0.8,
      }];
      mockFetch.mockResolvedValue(mockSuccessResponse(mockResult));

      const result = await provider.generateHypotheses({
        programId: 'prog-1',
        featureId: 'feat-1',
        featureName: 'User Profile',
        evidence: [{ id: 'ev-1', type: 'endpoint_observation', title: 'Profile endpoint', content: 'Returns user data' }],
        existingHypotheses: [],
      });

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('authorization');
      expect(result[0].priorityScore).toBe(7.5);
    });
  });

  describe('analyzeObservation', () => {
    it('returns valid ObservationAnalysis', async () => {
      const mockResult = {
        summary: 'Observed IDOR vulnerability',
        findings: ['Accessed user B data with user A token'],
        supportsHypothesis: true,
        newQuestions: ['Does this affect admin endpoints?'],
        recommendedNextSteps: ['Test admin endpoints', 'Report to program'],
        confidence: 0.95,
      };
      mockFetch.mockResolvedValue(mockSuccessResponse(mockResult));

      const result = await provider.analyzeObservation({
        hypothesisId: 'hyp-1',
        hypothesisStatement: 'User ID not validated',
        observation: {
          testDescription: 'Accessed /api/users/2 with user 1 token',
          expectedResult: '403 Forbidden',
          actualResult: '200 OK with user 2 data',
          evidenceIds: ['ev-1'],
        },
      });

      expect(result.supportsHypothesis).toBe(true);
      expect(result.confidence).toBe(0.95);
    });
  });

  describe('researchAdvisory', () => {
    it('returns valid AdvisoryAnalysis', async () => {
      const mockResult = {
        cveId: 'CVE-2024-1234',
        title: 'SQL Injection in Login',
        summary: 'Login endpoint vulnerable to SQLi',
        affectedComponents: ['login endpoint', 'user database'],
        severity: 'critical',
        relevanceScore: 0.9,
        actionRequired: true,
        recommendedActions: ['Test login endpoint', 'Check WAF rules'],
      };
      mockFetch.mockResolvedValue(mockSuccessResponse(mockResult));

      const result = await provider.researchAdvisory({
        advisory: { title: 'SQLi in Login', description: 'Vulnerable login', cveId: 'CVE-2024-1234', severity: 'critical', affectedProducts: ['Product X'] },
        programContext: { name: 'Test Program', platform: 'HackerOne', assets: [{ identifier: 'api.example.com', type: 'API' }] },
      });

      expect(result.cveId).toBe('CVE-2024-1234');
      expect(result.severity).toBe('critical');
      expect(result.actionRequired).toBe(true);
    });
  });

  describe('generateSessionSummary', () => {
    it('returns valid SessionSummary', async () => {
      const mockResult = {
        objective: 'Test user authentication',
        actionsTaken: ['Tested login', 'Tested password reset'],
        keyFindings: ['No rate limiting on login', 'Password reset leaks email existence'],
        nextSteps: ['Test 2FA bypass', 'Report findings'],
        handoffNotes: 'Focus on 2FA and email enumeration',
        confidence: 0.85,
      };
      mockFetch.mockResolvedValue(mockSuccessResponse(mockResult));

      const result = await provider.generateSessionSummary({
        session: { objective: 'Test auth', notes: 'Found issues', observations: [{ testDescription: 'Login test', expectedResult: 'Rate limited', actualResult: 'Not rate limited' }] },
      });

      expect(result.objective).toBe('Test user authentication');
      expect(result.keyFindings).toHaveLength(2);
    });
  });

  describe('draftReport', () => {
    it('returns valid ReportDraft', async () => {
      const mockResult = {
        title: 'IDOR on User Profile Endpoint',
        summary: 'User profile endpoint allows unauthorized access to other users\' data',
        reproductionSteps: ['Login as user A', 'Request /api/users/2', 'Observe user B data returned'],
        expectedBehavior: 'Should return 403 Forbidden',
        actualBehavior: 'Returns 200 OK with user B profile data',
        demonstratedImpact: 'Full account takeover of any user',
        remediation: 'Add authorization check to verify user owns requested resource',
        references: ['ev-1', 'ev-2'],
        confidence: 0.9,
      };
      mockFetch.mockResolvedValue(mockSuccessResponse(mockResult));

      const result = await provider.draftReport({
        hypothesis: { title: 'IDOR on User Profile', statement: 'User ID not validated', category: 'authorization', testPlan: 'Test with two users', expectedVulnerableResult: 'Access other user data', expectedSafeResult: '403 Forbidden', potentialImpact: 'high' },
        evidence: [{ id: 'ev-1', type: 'endpoint_observation', title: 'Profile endpoint', content: 'Returns user data' }],
        observations: [{ testDescription: 'Accessed /api/users/2', expectedResult: '403', actualResult: '200 with data', conclusion: 'Vulnerable' }],
      });

      expect(result.title).toBe('IDOR on User Profile Endpoint');
      expect(result.confidence).toBe(0.9);
    });
  });

  describe('error handling', () => {
    it('throws on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: vi.fn().mockResolvedValue('Rate limit exceeded'),
        status: 429,
      });

      await expect(provider.evaluateProgram({
        program: { name: 'Test', platform: 'Test', policyText: null, programUrl: 'https://test.com' },
        evidence: [],
      })).rejects.toThrow('Generic API error: 429 Rate limit exceeded');
    });

    it('throws on empty response', async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse({ choices: [{ message: { content: '' }, finish_reason: 'stop' }] }));

      await expect(provider.evaluateProgram({
        program: { name: 'Test', platform: 'Test', policyText: null, programUrl: 'https://test.com' },
        evidence: [],
      })).rejects.toThrow('Empty response from AI provider');
    });

    it('throws on invalid JSON', async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse('not valid json'));

      await expect(provider.evaluateProgram({
        program: { name: 'Test', platform: 'Test', policyText: null, programUrl: 'https://test.com' },
        evidence: [],
      })).rejects.toThrow('Failed to parse/validate AI response');
    });

    it('throws on schema validation failure', async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse({ invalid: 'schema' }));

      await expect(provider.evaluateProgram({
        program: { name: 'Test', platform: 'Test', policyText: null, programUrl: 'https://test.com' },
        evidence: [],
      })).rejects.toThrow('Failed to parse/validate AI response');
    });
  });

  describe('constructor', () => {
    it('throws if baseUrl missing', () => {
      expect(() => new GenericOpenAICompatibleProvider({
        baseUrl: '',
        apiKey: 'test',
        model: 'test',
      })).toThrow('baseUrl is required');
    });

    it('strips trailing slashes from baseUrl', () => {
      const p = new GenericOpenAICompatibleProvider({
        baseUrl: 'http://localhost:11434/v1/',
        apiKey: 'test',
        model: 'test',
      });
      // Access private config via reflection for test
      expect((p as any).config.baseUrl).toBe('http://localhost:11434/v1');
    });
  });
});