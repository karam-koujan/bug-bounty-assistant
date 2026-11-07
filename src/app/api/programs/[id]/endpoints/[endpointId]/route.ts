import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { endpoints } from '@/lib/db/schema';
import { endpointParamsSchema, endpointUpdateSchema } from '@/lib/validation';
import { eq, and } from 'drizzle-orm';
import { ZodError } from 'zod';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; endpointId: string }> }
) {
  try {
    const { id, endpointId } = await params;
    endpointParamsSchema.parse({ id: endpointId });
    const body = await request.json();
    const validated = endpointUpdateSchema.parse(body);

    const updateData: Record<string, unknown> = { ...validated };
    if (validated.method) updateData.method = validated.method.toUpperCase();

    const result = await db.update(endpoints).set(updateData).where(
      and(eq(endpoints.id, endpointId), eq(endpoints.programId, id))
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
    }

    return NextResponse.json({ id: endpointId, ...validated });
  } catch (error) {
    console.error('PATCH /api/programs/[id]/endpoints/[endpointId] error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update endpoint' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; endpointId: string }> }
) {
  try {
    const { id, endpointId } = await params;
    endpointParamsSchema.parse({ id: endpointId });

    const result = await db.delete(endpoints).where(
      and(eq(endpoints.id, endpointId), eq(endpoints.programId, id))
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/programs/[id]/endpoints/[endpointId] error:', error);
    return NextResponse.json({ error: 'Failed to delete endpoint' }, { status: 500 });
  }
}