import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assets } from '@/lib/db/schema';
import { assetUpdateSchema, assetParamsSchema } from '@/lib/validation';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const { assetId } = await params;
    const parsed = assetParamsSchema.parse({ id: assetId });

    const asset = await db.select().from(assets).where(eq(assets.id, parsed.id)).limit(1);

    if (asset.length === 0) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json(asset[0]);
  } catch (error) {
    console.error('GET /api/programs/[id]/scope/[assetId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const { assetId } = await params;
    const parsed = assetParamsSchema.parse({ id: assetId });
    const body = await request.json();
    const validated = assetUpdateSchema.parse(body);

    const existing = await db.select().from(assets).where(eq(assets.id, parsed.id)).limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const updateData = {
      ...validated,
      restrictionsJson: validated.restrictionsJson ? JSON.stringify(validated.restrictionsJson) : undefined,
    };

    await db.update(assets).set(updateData).where(eq(assets.id, parsed.id));

    const updated = await db.select().from(assets).where(eq(assets.id, parsed.id)).limit(1);

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PATCH /api/programs/[id]/scope/[assetId] error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const { assetId } = await params;
    const parsed = assetParamsSchema.parse({ id: assetId });

    const existing = await db.select().from(assets).where(eq(assets.id, parsed.id)).limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    await db.delete(assets).where(eq(assets.id, parsed.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/programs/[id]/scope/[assetId] error:', error);
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}