import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { researchSessions } from '@/lib/db/schema';
import { sessionParamsSchema, sessionUpdateSchema } from '@/lib/validation';
import { eq, and } from 'drizzle-orm';
import { ZodError } from 'zod';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id, sessionId } = await params;
    sessionParamsSchema.parse({ id: sessionId });
    const body = await request.json();
    const validated = sessionUpdateSchema.parse(body);

    const updateData: Record<string, unknown> = { ...validated };
    if (validated.nextStepsJson) updateData.nextStepsJson = JSON.stringify(validated.nextStepsJson);
    updateData.updatedAt = new Date();

    const result = await db.update(researchSessions).set(updateData).where(
      and(eq(researchSessions.id, sessionId), eq(researchSessions.programId, id))
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ id: sessionId, ...validated });
  } catch (error) {
    console.error('PATCH /api/programs/[id]/sessions/[sessionId] error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id, sessionId } = await params;
    sessionParamsSchema.parse({ id: sessionId });

    const result = await db.delete(researchSessions).where(
      and(eq(researchSessions.id, sessionId), eq(researchSessions.programId, id))
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/programs/[id]/sessions/[sessionId] error:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}