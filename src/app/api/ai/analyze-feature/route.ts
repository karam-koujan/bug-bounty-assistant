import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { features, endpoints, evidence } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
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

    const feature = await db.query.features.findFirst({
      where: and(eq(features.id, featureId), eq(features.programId, programId)),
    });

    if (!feature) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    const [featureEndpoints, featureEvidence] = await Promise.all([
      db.query.endpoints.findMany({
        where: and(eq(endpoints.featureId, featureId), eq(endpoints.programId, programId)),
      }),
      db.query.evidence.findMany({
        where: eq(evidence.programId, programId),
      }),
    ]);

    const engine = await getHypothesisEngine();
    // Note: analyzeFeature is not in HypothesisEngine interface yet
    // We'll call the AI directly through the factory
    const { createAIProvider, getProviderFromEnv } = await import('@/lib/ai/factory');
    const { provider, config } = getProviderFromEnv();
    const ai = createAIProvider(provider, config);

    const analysis = await ai.analyzeFeature({
      feature: {
        name: feature.name,
        description: feature.description,
        roles: JSON.parse(feature.rolesJson || '[]'),
        resourceTypes: JSON.parse(feature.resourceTypesJson || '[]'),
        securityProperties: JSON.parse(feature.expectedSecurityPropertiesJson || '[]'),
      },
      endpoints: featureEndpoints.map(e => ({
        method: e.method,
        path: e.pathTemplate,
        auth: e.authenticationRequirement,
      })),
      evidence: featureEvidence.map(e => ({
        id: e.id,
        type: e.evidenceType,
        title: e.title,
        content: e.content,
      })),
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('AI analyze feature error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}