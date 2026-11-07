import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hypotheses, evidence, testObservations } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

interface ObservationInput {
  testDescription: string;
  expectedResult: string;
  actualResult: string;
  conclusion: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = await params;
    const body = await request.json();
    const { hypothesisId } = body;

    if (!hypothesisId) {
      return NextResponse.json({ error: 'hypothesisId is required' }, { status: 400 });
    }

    const hypothesis = await db.query.hypotheses.findFirst({
      where: and(eq(hypotheses.id, hypothesisId), eq(hypotheses.programId, programId)),
    });

    if (!hypothesis) {
      return NextResponse.json({ error: 'Hypothesis not found' }, { status: 404 });
    }

    // M6 policy: reports may only be drafted from a researcher-confirmed finding.
    if (hypothesis.status !== 'confirmed_finding') {
      return NextResponse.json(
        {
          error:
            'Reports can only be drafted from a confirmed finding (researcher-approved). Current hypothesis status: ' +
            hypothesis.status,
        },
        { status: 409 }
      );
    }

    // Fetch supporting evidence — strictly program-scoped (cross-program isolation).
    const supportingEvidenceIds = JSON.parse(hypothesis.supportingEvidenceJson || '[]');
    const supportingEvidence = supportingEvidenceIds.length > 0
      ? await db.select().from(evidence).where(
          and(inArray(evidence.id, supportingEvidenceIds), eq(evidence.programId, programId))
        )
      : [];

    // Fetch recorded test observations for the hypothesis (not hardcoded).
    const observations: Array<ObservationInput> = (
      await db
        .select()
        .from(testObservations)
        .where(eq(testObservations.hypothesisId, hypothesisId))
    ).map((o) => ({
      testDescription: o.testDescription,
      expectedResult: o.expectedResult ?? '',
      actualResult: o.actualResult ?? '',
      conclusion: o.conclusion ?? 'inconclusive',
    }));

    const { createAIProvider, getProviderFromEnv } = await import('@/lib/ai/factory');
    const { provider, config } = getProviderFromEnv();
    const ai = createAIProvider(provider, config);

    const draft = await ai.draftReport({
      hypothesis: {
        title: hypothesis.title,
        statement: hypothesis.statement,
        category: hypothesis.category,
        testPlan: hypothesis.testPlan || '',
        expectedVulnerableResult: hypothesis.expectedVulnerableResult || '',
        expectedSafeResult: hypothesis.expectedSafeResult || '',
        potentialImpact: hypothesis.potentialImpact ?? 'medium',
      },
      evidence: supportingEvidence.map(e => ({
        id: e.id,
        type: e.evidenceType,
        title: e.title,
        content: e.content,
      })),
      observations,
    });

    return NextResponse.json({ draft });
  } catch (error) {
    console.error('AI draft report error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Report drafting failed' },
      { status: 500 }
    );
  }
}