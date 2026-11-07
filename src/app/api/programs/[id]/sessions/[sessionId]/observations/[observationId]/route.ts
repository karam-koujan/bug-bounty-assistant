import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { testObservations } from '@/lib/db/schema';
import { observationParamsSchema, observationUpdateSchema } from '@/lib/validation';
import { eq, and } from 'drizzle-orm';
import { ZodError } from 'zod';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string; observationId: string }> }
) {
  try {
    const { id, sessionId, observationId } = await params;
    observationParamsSchema.parse({ id: observationId });
    const body = await request.json();
    const validated = observationUpdateSchema.parse(body);

    const updateData: Record<string, unknown> = { ...validated };
    if (validated.evidenceIdsJson) updateData.evidenceIdsJson = JSON.stringify(validated.evidenceIdsJson);

    const result = await db.update(testObservations).set(updateData).where(
      and(eq(testObservations.id, observationId), eq(testObservations.sessionId, sessionId))
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Observation not found' }, { status: 404 });
    }

    return NextResponse.json({ id: observationId, ...validated });
  } catch (error) {
    console.error('PATCH /api/programs/[id]/sessions/[sessionId]/observations/[observationId] error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update observation' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string; observationId: string }> }
) {
  try {
    const { id, sessionId, observationId } = await params;
    observationParamsSchema.parse({ id: observationId });

    const result = await db.delete(testObservations).where(
      and(eq(testObservations.id, observationId), eq(testObservations.sessionId, sessionId))
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Observation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/programs/[id]/sessions/[sessionId]/observations/[observationId] error:', error);
    return NextResponse.json({ error: 'Failed to delete observation' }, { status: 500 });
  }
}