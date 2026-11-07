import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = await params;
    const body = await request.json();
    const { session } = body;

    if (!session || !session.objective) {
      return NextResponse.json({ error: 'session with objective is required' }, { status: 400 });
    }

    const { createAIProvider, getProviderFromEnv } = await import('@/lib/ai/factory');
    const { provider, config } = getProviderFromEnv();
    const ai = createAIProvider(provider, config);

    const summary = await ai.generateSessionSummary({
      session: {
        objective: session.objective,
        notes: session.notes || '',
        observations: session.observations || [],
      },
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('AI session summary error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Session summary failed' },
      { status: 500 }
    );
  }
}