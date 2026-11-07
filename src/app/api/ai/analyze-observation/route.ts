import { NextRequest, NextResponse } from 'next/server';
import { getHypothesisEngine } from '@/lib/services/hypothesis-engine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = await params;
    const body = await request.json();
    const { hypothesisId, testDescription, expectedResult, actualResult, evidenceIds } = body;

    if (!hypothesisId || !testDescription) {
      return NextResponse.json(
        { error: 'hypothesisId and testDescription are required' },
        { status: 400 }
      );
    }

    const engine = await getHypothesisEngine();
    const analysis = await engine.analyzeObservation(
      hypothesisId,
      testDescription,
      expectedResult || '',
      actualResult || '',
      evidenceIds || []
    );

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('AI analyze observation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Observation analysis failed' },
      { status: 500 }
    );
  }
}