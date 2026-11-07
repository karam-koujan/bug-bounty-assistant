import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assets } from '@/lib/db/schema';
import { assetCreateSchema, assetParamsSchema } from '@/lib/validation';
import { eq, and, count, desc, asc, like } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = assetParamsSchema.parse(await params);
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const scopeStatus = searchParams.get('scopeStatus');
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;

    const conditions = [eq(assets.programId, id)];
    if (scopeStatus) conditions.push(eq(assets.scopeStatus, scopeStatus as 'in_scope' | 'out_of_scope' | 'unknown'));
    if (search) conditions.push(like(assets.assetIdentifier, `%${search}%`));

    const whereClause = and(...conditions);

    const [data, totalResult] = await Promise.all([
      db.select().from(assets).where(whereClause).orderBy(desc(assets.assetIdentifier)).limit(limit).offset(offset),
      db.select({ count: count() }).from(assets).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/programs/[id]/scope error:', error);
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = assetParamsSchema.parse(await params);
    const body = await request.json();
    const validated = assetCreateSchema.parse({ ...body, programId });

    const id = randomUUID();
    const newAsset = {
      id,
      ...validated,
      restrictionsJson: JSON.stringify(validated.restrictionsJson),
    };

    try {
      await db.insert(assets).values(newAsset);
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        return NextResponse.json(
          { error: 'Asset identifier already exists for this program' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ id, ...validated }, { status: 201 });
  } catch (error) {
    console.error('POST /api/programs/[id]/scope error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
  }
}