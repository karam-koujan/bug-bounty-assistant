import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { endpoints } from '@/lib/db/schema';
import { endpointCreateSchema, endpointListQuerySchema, endpointParamsSchema } from '@/lib/validation';
import { eq, and, count, desc, asc, like } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = endpointParamsSchema.parse(await params);
    const { searchParams } = new URL(request.url);
    const query = endpointListQuerySchema.parse(Object.fromEntries(searchParams));

    const { page, limit, assetId, featureId, method, testStatus, search, sortBy, sortOrder } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(endpoints.programId, id)];
    if (assetId) conditions.push(eq(endpoints.assetId, assetId));
    if (featureId) conditions.push(eq(endpoints.featureId, featureId));
    if (method) conditions.push(eq(endpoints.method, method.toUpperCase()));
    if (testStatus) conditions.push(eq(endpoints.testStatus, testStatus));
    if (search) conditions.push(like(endpoints.pathTemplate, `%${search}%`));

    const whereClause = and(...conditions);

    const orderByColumn = (() => {
      switch (sortBy) {
        case 'method': return endpoints.method;
        case 'pathTemplate': return endpoints.pathTemplate;
        case 'testStatus': return endpoints.testStatus;
        case 'createdAt': return endpoints.createdAt;
        default: return endpoints.method;
      }
    })();

    const [data, totalResult] = await Promise.all([
      db.select().from(endpoints).where(whereClause).orderBy(
        sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn)
      ).limit(limit).offset(offset),
      db.select({ count: count() }).from(endpoints).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/programs/[id]/endpoints error:', error);
    return NextResponse.json({ error: 'Failed to fetch endpoints' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = endpointParamsSchema.parse(await params);
    const body = await request.json();
    const validated = endpointCreateSchema.parse({ ...body, programId });

    const id = randomUUID();
    const newEndpoint = {
      id,
      ...validated,
      method: validated.method.toUpperCase(),
    };

    await db.insert(endpoints).values(newEndpoint);

    return NextResponse.json({ id, ...validated }, { status: 201 });
  } catch (error) {
    console.error('POST /api/programs/[id]/endpoints error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create endpoint' }, { status: 500 });
  }
}