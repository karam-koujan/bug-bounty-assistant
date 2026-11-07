import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { features } from '@/lib/db/schema';
import { featureCreateSchema, featureListQuerySchema, featureParamsSchema } from '@/lib/validation';
import { eq, and, count, desc, asc, like } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = featureParamsSchema.parse(await params);
    const { searchParams } = new URL(request.url);
    const query = featureListQuerySchema.parse(Object.fromEntries(searchParams));

    const { page, limit, assetId, search, sortBy, sortOrder } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(features.programId, id)];
    if (assetId) conditions.push(eq(features.assetId, assetId));
    if (search) conditions.push(like(features.name, `%${search}%`));

    const whereClause = and(...conditions);

    const orderByColumn = (() => {
      switch (sortBy) {
        case 'name': return features.name;
        case 'createdAt': return features.createdAt;
        default: return features.name;
      }
    })();

    const [data, totalResult] = await Promise.all([
      db.select().from(features).where(whereClause).orderBy(
        sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn)
      ).limit(limit).offset(offset),
      db.select({ count: count() }).from(features).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/programs/[id]/features error:', error);
    return NextResponse.json({ error: 'Failed to fetch features' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = featureParamsSchema.parse(await params);
    const body = await request.json();
    const validated = featureCreateSchema.parse({ ...body, programId });

    const id = randomUUID();
    const newFeature = {
      id,
      ...validated,
      rolesJson: JSON.stringify(validated.rolesJson),
      resourceTypesJson: JSON.stringify(validated.resourceTypesJson),
      expectedSecurityPropertiesJson: JSON.stringify(validated.expectedSecurityPropertiesJson),
    };

    await db.insert(features).values(newFeature);

    return NextResponse.json({ id, ...validated }, { status: 201 });
  } catch (error) {
    console.error('POST /api/programs/[id]/features error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create feature' }, { status: 500 });
  }
}