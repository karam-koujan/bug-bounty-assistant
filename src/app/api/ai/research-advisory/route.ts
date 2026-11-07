import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { programs, assets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = await params;
    const body = await request.json();
    const { advisory } = body;

    if (!advisory || !advisory.title) {
      return NextResponse.json({ error: 'advisory with title is required' }, { status: 400 });
    }

    const program = await db.query.programs.findFirst({
      where: eq(programs.id, programId),
    });

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const programAssets = await db.query.assets.findMany({
      where: eq(assets.programId, programId),
    });

    const { createAIProvider, getProviderFromEnv } = await import('@/lib/ai/factory');
    const { provider, config } = getProviderFromEnv();
    const ai = createAIProvider(provider, config);

    const analysis = await ai.researchAdvisory({
      advisory: {
        title: advisory.title,
        description: advisory.description || '',
        cveId: advisory.cveId || null,
        severity: advisory.severity || 'medium',
        affectedProducts: advisory.affectedProducts || [],
      },
      programContext: {
        name: program.name,
        platform: program.platform,
        assets: programAssets.map(a => ({
          identifier: a.assetIdentifier,
          type: a.assetType,
        })),
      },
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('AI research advisory error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Advisory analysis failed' },
      { status: 500 }
    );
  }
}