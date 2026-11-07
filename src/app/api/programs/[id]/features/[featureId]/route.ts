import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { features } from '@/lib/db/schema';
import { featureParamsSchema, featureUpdateSchema } from '@/lib/validation';
import { eq, and } from 'drizzle-orm';
import { ZodError } from 'zod';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; featureId: string }> }
) {
  try {
    const { id, featureId } = await params;
    featureParamsSchema.parse({ id: featureId });
    const body = await request.json();
    const validated = featureUpdateSchema.parse(body);

    const updateData: Record<string, unknown> = { ...validated };
    if (validated.rolesJson) updateData.rolesJson = JSON.stringify(validated.rolesJson);
    if (validated.resourceTypesJson) updateData.resourceTypesJson = JSON.stringify(validated.resourceTypesJson);
    if (validated.expectedSecurityPropertiesJson) updateData.expectedSecurityPropertiesJson = JSON.stringify(validated.expectedSecurityPropertiesJson);

    const result = await db.update(features).set(updateData).where(
      and(eq(features.id, featureId), eq(features.programId, id))
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    return NextResponse.json({ id: featureId, ...validated });
  } catch (error) {
    console.error('PATCH /api/programs/[id]/features/[featureId] error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update feature' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; featureId: string }> }
) {
  try {
    const { id, featureId } = await params;
    featureParamsSchema.parse({ id: featureId });

    const result = await db.delete(features).where(
      and(eq(features.id, featureId), eq(features.programId, id))
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/programs/[id]/features/[featureId] error:', error);
    return NextResponse.json({ error: 'Failed to delete feature' }, { status: 500 });
  }
}