import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { programs } from '@/lib/db/schema';
import { programUpdateSchema, programParamsSchema } from '@/lib/validation';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = programParamsSchema.parse(await params);

    const program = await db.select().from(programs).where(eq(programs.id, id)).limit(1);

    if (program.length === 0) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    return NextResponse.json(program[0]);
  } catch (error) {
    console.error('GET /api/programs/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch program' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = programParamsSchema.parse(await params);
    const body = await request.json();
    const validated = programUpdateSchema.parse(body);

    const existing = await db.select().from(programs).where(eq(programs.id, id)).limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      ...validated,
      updatedAt: new Date(),
    };

    if (validated.evaluationScoresJson) {
      updateData.evaluationScoresJson = JSON.stringify(validated.evaluationScoresJson);
    }
    if (validated.policyReviewedAt) {
      updateData.policyReviewedAt = new Date(validated.policyReviewedAt);
    }

    await db.update(programs).set(updateData).where(eq(programs.id, id));

    const updated = await db.select().from(programs).where(eq(programs.id, id)).limit(1);

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PATCH /api/programs/[id] error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update program' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = programParamsSchema.parse(await params);

    const existing = await db.select().from(programs).where(eq(programs.id, id)).limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    await db.delete(programs).where(eq(programs.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/programs/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete program' }, { status: 500 });
  }
}