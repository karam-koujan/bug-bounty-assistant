import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evidence } from '@/lib/db/schema';
import { evidenceUpdateSchema, evidenceParamsSchema } from '@/lib/validation';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; evidenceId: string }> }
) {
  try {
    const { evidenceId } = await params;
    const parsed = evidenceParamsSchema.parse({ id: evidenceId });

    const ev = await db.select().from(evidence).where(eq(evidence.id, parsed.id)).limit(1);

    if (ev.length === 0) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    }

    return NextResponse.json(ev[0]);
  } catch (error) {
    console.error('GET /api/programs/[id]/evidence/[evidenceId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch evidence' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; evidenceId: string }> }
) {
  try {
    const { evidenceId } = await params;
    const parsed = evidenceParamsSchema.parse({ id: evidenceId });
    const body = await request.json();
    const validated = evidenceUpdateSchema.parse(body);

    const existing = await db.select().from(evidence).where(eq(evidence.id, parsed.id)).limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { ...validated };
    if (validated.metadataJson) {
      updateData.metadataJson = JSON.stringify(validated.metadataJson);
    }
    if (validated.collectedAt) {
      updateData.collectedAt = new Date(validated.collectedAt);
    }

    await db.update(evidence).set(updateData).where(eq(evidence.id, parsed.id));

    const updated = await db.select().from(evidence).where(eq(evidence.id, parsed.id)).limit(1);

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PATCH /api/programs/[id]/evidence/[evidenceId] error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update evidence' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; evidenceId: string }> }
) {
  try {
    const { evidenceId } = await params;
    const parsed = evidenceParamsSchema.parse({ id: evidenceId });

    const existing = await db.select().from(evidence).where(eq(evidence.id, parsed.id)).limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    }

    await db.delete(evidence).where(eq(evidence.id, parsed.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/programs/[id]/evidence/[evidenceId] error:', error);
    return NextResponse.json({ error: 'Failed to delete evidence' }, { status: 500 });
  }
}