import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { programs, evidence } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getHypothesisEngine } from '@/lib/services/hypothesis-engine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = await params;
    const body = await request.json();
    const { force = false } = body;

    const program = await db.query.programs.findFirst({
      where: eq(programs.id, programId),
    });

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const programEvidence = await db.query.evidence.findMany({
      where: eq(evidence.programId, programId),
    });

    if (programEvidence.length === 0 && !force) {
      return NextResponse.json(
        { error: 'No evidence available for evaluation. Add evidence first or use force=true.' },
        { status: 400 }
      );
    }

    const engine = await getHypothesisEngine();
    // Note: evaluateProgram is not in HypothesisEngine interface yet
    // We'll call the AI directly through the factory
    const { createAIProvider, getProviderFromEnv } = await import('@/lib/ai/factory');
    const { provider, config } = getProviderFromEnv();
    const ai = createAIProvider(provider, config);

    const evaluation = await ai.evaluateProgram({
      program: {
        name: program.name,
        platform: program.platform,
        policyText: program.policyText,
        programUrl: program.programUrl,
      },
      evidence: programEvidence.map(e => ({
        id: e.id,
        type: e.evidenceType,
        title: e.title,
        content: e.content,
      })),
    });

    // Update program with evaluation scores
    await db.update(programs).set({
      evaluationScoresJson: JSON.stringify(evaluation.scores),
      policyReviewedAt: evaluation.confidence > 0.7 ? new Date() : null,
      researchStatus: 'evaluating',
      updatedAt: new Date(),
    }).where(eq(programs.id, programId));

    return NextResponse.json({ evaluation });
  } catch (error) {
    console.error('AI evaluate program error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Evaluation failed' },
      { status: 500 }
    );
  }
}