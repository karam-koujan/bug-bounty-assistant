import { db } from '@/lib/db';
import { hypotheses, aiRuns, evidence, programs, assets } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'not_required';

export interface ApprovalRequest {
  hypothesisId: string;
  programId: string;
  requestedBy: string;
  reason: string;
}

export interface ApprovalDecision {
  hypothesisId: string;
  status: ApprovalStatus;
  decidedBy: string;
  decidedAt: Date;
  notes?: string;
}

export class PolicyApprovalGate {
  async requestApproval(request: ApprovalRequest): Promise<{ required: boolean; status: ApprovalStatus; reason?: string }> {
    const hypothesis = await db.query.hypotheses.findFirst({
      where: eq(hypotheses.id, request.hypothesisId),
      with: { feature: true },
    });

    if (!hypothesis) {
      throw new Error('Hypothesis not found');
    }

    const program = await db.query.programs.findFirst({
      where: eq(programs.id, request.programId),
    });

    if (!program) {
      throw new Error('Program not found');
    }

    // Check if hypothesis is in a state that requires approval
    if (hypothesis.status !== 'ready_for_review' && hypothesis.status !== 'approved_for_testing') {
      return { required: false, status: 'not_required', reason: `Hypothesis status is ${hypothesis.status}` };
    }

    // Check scope compliance for all related assets
    if (hypothesis.featureId) {
      const feature = await db.query.features.findFirst({
        where: eq(hypotheses.featureId, hypothesis.featureId),
      });

      if (feature?.assetId) {
        const asset = await db.query.assets.findFirst({
          where: eq(assets.id, feature.assetId),
        });

        if (asset && asset.scopeStatus !== 'in_scope') {
          return {
            required: true,
            status: 'rejected',
            reason: `Associated asset "${asset.assetIdentifier}" is ${asset.scopeStatus}. Testing not allowed.`,
          };
        }
      }
    }

    // Check program policy allows testing
    if (program.policyText) {
      const policyAllows = this.checkPolicyAllows(program.policyText, hypothesis);
      if (!policyAllows.allowed) {
        return {
          required: true,
          status: 'rejected',
          reason: policyAllows.reason,
        };
      }
    }

    // Check if hypothesis has required fields for testing
    const validation = await this.validateHypothesisForTesting(
    {
      testPlan: hypothesis.testPlan,
      expectedVulnerableResult: hypothesis.expectedVulnerableResult,
      expectedSafeResult: hypothesis.expectedSafeResult,
      category: hypothesis.category,
      programId: hypothesis.programId,
    },
    // Pass targetStatus only when the gate would set a gated status;
    // the PATCH handler also enforces evidence, so we keep it simple here.
    undefined
  );
    if (!validation.valid) {
      return {
        required: true,
        status: 'rejected',
        reason: validation.reason,
      };
    }

    return { required: true, status: 'pending' };
  }

  async approve(decision: ApprovalDecision): Promise<void> {
    const newStatus = decision.status === 'approved' ? 'approved_for_testing' : 'rejected';
    // Persist an audited ai_runs row so the decision is traceable.
    const approvalId = `approval-${decision.hypothesisId}-${Date.now()}`;
    await db.insert(aiRuns).values({
      id: approvalId,
      hypothesisId: decision.hypothesisId,
      taskType: 'hypothesis_approval',
      provider: 'gate',
      model: 'policy-approval',
      promptVersion: '1.0',
      inputReferenceIdsJson: JSON.stringify([decision.hypothesisId]),
      outputJson: JSON.stringify({ status: newStatus, hypothesisId: decision.hypothesisId, decidedBy: decision.decidedBy || 'unknown' }),
      validationStatus: 'valid',
      createdAt: Math.floor(Date.now() / 1000),
    }).run();

    await db.update(hypotheses).set({
      status: newStatus,
      updatedAt: new Date(),
    }).where(eq(hypotheses.id, decision.hypothesisId));
  }

  async getApprovalStatus(hypothesisId: string): Promise<ApprovalStatus> {
    const hypothesis = await db.query.hypotheses.findFirst({
      where: eq(hypotheses.id, hypothesisId),
    });

    if (!hypothesis) {
      throw new Error('Hypothesis not found');
    }

    switch (hypothesis.status) {
      case 'approved_for_testing':
        return 'approved';
      case 'rejected':
        return 'rejected';
      case 'ready_for_review':
        return 'pending';
      default:
        return 'not_required';
    }
  }

  private checkPolicyAllows(policyText: string, hypothesis: { testPlan: string | null; category: string }): { allowed: boolean; reason?: string } {
    const policyLower = policyText.toLowerCase();
    const testPlanLower = hypothesis.testPlan?.toLowerCase() || '';

    // Extract key test activities from test plan
    const testActivities = this.extractTestActivities(testPlanLower);
    
    // Check for explicit prohibitions with context awareness
    const prohibitedPatterns = [
      { pattern: 'no testing', context: ['any', 'all', 'anywhere'] },
      { pattern: 'do not test', context: ['this', 'these', 'the following'] },
      { pattern: 'prohibited', context: ['testing', 'access', 'activity'] },
      { pattern: 'out of scope', context: ['asset', 'domain', 'subdomain', 'endpoint'] },
      { pattern: 'not authorized', context: ['to test', 'to access', 'for testing'] },
      { pattern: 'denied', context: ['testing', 'access', 'permission'] },
    ];

    for (const { pattern, context } of prohibitedPatterns) {
      if (policyLower.includes(pattern)) {
        // Check if pattern appears in relevant context
        const patternIndex = policyLower.indexOf(pattern);
        const contextWindow = policyLower.substring(Math.max(0, patternIndex - 50), patternIndex + 100);
        
        // Only flag if the prohibition is general or matches our test activities
        const hasRelevantContext = context.some(ctx => contextWindow.includes(ctx));
        const matchesTestActivity = testActivities.some(activity => contextWindow.includes(activity));
        
        if (hasRelevantContext || matchesTestActivity) {
          return { allowed: false, reason: `Policy contains "${pattern}" which may apply to this test` };
        }
      }
    }

    // Check for asset-specific exclusions
    if (hypothesis.testPlan) {
      const assetMatches = testPlanLower.match(/(?:domain|host|endpoint|url|api)\s*[:=]\s*([^\s,]+)/g);
      if (assetMatches) {
        for (const match of assetMatches) {
          const asset = match.split(/[:=]/)[1]?.trim();
          if (asset && policyLower.includes(asset.toLowerCase()) && 
              (policyLower.includes('out of scope') || policyLower.includes('excluded') || policyLower.includes('prohibited'))) {
            return { allowed: false, reason: `Policy may exclude asset: ${asset}` };
          }
        }
      }
    }

    return { allowed: true };
  }

  private async validateHypothesisForTesting(
    hypothesis: {
      testPlan: string | null;
      expectedVulnerableResult: string | null;
      expectedSafeResult: string | null;
      category: string;
      programId: string;
    },
    targetStatus?: string
  ): Promise<{ valid: boolean; reason?: string }> {
    if (!hypothesis.testPlan || hypothesis.testPlan.trim().length < 20) {
      return { valid: false, reason: 'Test plan is missing or too short (minimum 20 characters)' };
    }

    if (!hypothesis.expectedVulnerableResult || hypothesis.expectedVulnerableResult.trim().length < 10) {
      return { valid: false, reason: 'Expected vulnerable result is missing or too short' };
    }

    if (!hypothesis.expectedSafeResult || hypothesis.expectedSafeResult.trim().length < 10) {
      return { valid: false, reason: 'Expected safe result is missing or too short' };
    }

    // Enforce evidence requirements for gated statuses.
    if (targetStatus) {
      const evidenceCheck = await this.checkEvidenceForGatedStatus(
        hypothesis as typeof hypotheses.$inferSelect,
        targetStatus
      );
      if (!evidenceCheck.ok) {
        return { valid: false, reason: evidenceCheck.reason };
      }
    }

    return { valid: true };
  }

  private async checkEvidenceForGatedStatus(
    hypothesis: typeof hypotheses.$inferSelect,
    targetStatus: string
  ): Promise<{ ok: boolean; reason?: string }> {
    if (!['supported_by_evidence', 'confirmed_finding'].includes(targetStatus)) {
      return { ok: true };
    }
    const evidenceIds = hypothesis.supportingEvidenceJson ?? [];
    if (!Array.isArray(evidenceIds) || evidenceIds.length === 0) {
      return { ok: false, reason: 'At least one supporting evidence ID is required for this status.' };
    }
    for (const id of evidenceIds) {
      // Ensure the ID is a valid UUID format (simple check)
      const uuidPattern = /^[0-9a-f-]{36}$/i;
      if (!uuidPattern.test(id)) {
        return { ok: false, reason: `Invalid evidence ID format: ${id}` };
      }
      const ev = await db.query.evidence.findFirst({
        where: and(eq(evidence.id, id), eq(evidence.programId, hypothesis.programId)),
      });
      if (!ev) {
        return {
          ok: false,
          reason: `Evidence ID "${id}" not found or does not belong to this program.`,
        };
      }
    }
    return { ok: true };
  }

  private extractTestActivities(testPlan: string): string[] {
    const activities: string[] = [];
    const activityKeywords = [
      'login', 'authentication', 'authorization', 'session', 'cookie', 'token',
      'injection', 'xss', 'csrf', 'idor', 'path traversal', 'file upload',
      'rate limit', 'brute force', 'enum', 'fuzz', 'scan', 'probe',
      'bypass', 'escalation', 'privilege', 'admin', 'account takeover',
      'information disclosure', 'debug', 'stack trace', 'error',
      'redirect', 'open redirect', 'ssrf', 'rce', 'deserialization',
    ];
    
    for (const keyword of activityKeywords) {
      if (testPlan.includes(keyword)) {
        activities.push(keyword);
      }
    }
    return activities;
  }
}

export async function getPolicyApprovalGate(): Promise<PolicyApprovalGate> {
  return new PolicyApprovalGate();
}