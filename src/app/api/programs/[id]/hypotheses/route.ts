import { NextRequest, NextResponse } from 'next/server';
import { and, asc, count, desc, eq, like } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';
import { db } from '@/lib/db';
import { hypotheses } from '@/lib/db/schema';
import {
  hypothesisCreateSchema,
  hypothesisListQuerySchema,
  hypothesisParamsSchema,
} from '@/lib/validation/hypotheses';

/** GET/POST /api/programs/[id]/hypotheses (M4.11/M4.12 — hypothesis CRUD). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = hypothesisParamsSchema.parse(await params);
    const { searchParams } = new URL(request.url);
    const query = hypothesisListQuerySchema.parse(Object.fromEntries(searchParams));
    const { page, limit, status, featureId, search, sortBy, sortOrder } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(hypotheses.programId, id)];
    if (status) conditions.push(eq(hypotheses.status, status));
    if (featureId) conditions.push(eq(hypotheses.featureId, featureId));
    if (search) conditions.push(like(hypotheses.title, `%${search}%`));
    const where = and(...conditions);

    const orderByColumn = (() => {
      switch (sortBy) {
        case 'title': return hypotheses.title;
        case 'category': return hypotheses.category;
        case 'status': return hypotheses.status;
        case 'createdAt': return hypotheses.createdAt;
        case 'updatedAt': return hypotheses.updatedAt;
        default: return hypotheses.priorityScore;
      }
    })();

    const [data, totalResult] = await Promise.all([
      db.select().from(hypotheses).where(where)
        .orderBy(sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn))
        .limit(limit).offset(offset),
      db.select({ c: count() }).from(hypotheses).where(where),
    ]);

    const total = totalResult[0]?.c ?? 0;
    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/programs/[id]/hypotheses error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch hypotheses' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = hypothesisParamsSchema.parse(await params);
    const body = await request.json();
    const validated = hypothesisCreateSchema.parse({ ...body, programId });

    const id = randomUUID();
    await db.insert(hypotheses).values({
      id,
      ...validated,
      supportingEvidenceJson: JSON.stringify(validated.supportingEvidenceJson),
      contradictingEvidenceJson: JSON.stringify(validated.contradictingEvidenceJson),
      assumptionsJson: JSON.stringify(validated.assumptionsJson),
      prerequisitesJson: JSON.stringify(validated.prerequisitesJson),
      priorityBreakdownJson: JSON.stringify(validated.priorityBreakdownJson),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ id, ...validated }, { status: 201 });
  } catch (error) {
    console.error('POST /api/programs/[id]/hypotheses error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create hypothesis' }, { status: 500 });
  }
}
