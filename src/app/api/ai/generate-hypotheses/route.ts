import { NextRequest, NextResponse } from 'next/server';
import { getHypothesisEngine } from '@/lib/services/hypothesis-engine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = await params;
    const body = await request.json();
    const { featureId } = body;

    if (!featureId) {
      return NextResponse.json({ error: 'featureId is required' }, { status: 400 });
    }

    const engine = await getHypothesisEngine();
    const hypotheses = await engine.generateHypothesesForFeature(programId, featureId);

    return NextResponse.json({ hypotheses });
  } catch (error) {
    console.error('AI generate hypotheses error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Hypothesis generation failed' },
      { status: 500 }
    );
  }
}