import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { programs } from '@/lib/db/schema';
import { programCreateSchema, programListQuerySchema } from '@/lib/validation';
import { eq, desc, asc, like, and, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = programListQuerySchema.parse(Object.fromEntries(searchParams));

    const { page, limit, status, platform, search, sortBy, sortOrder } = query;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (status) conditions.push(eq(programs.researchStatus, status));
    if (platform) conditions.push(eq(programs.platform, platform));
    if (search) conditions.push(like(programs.name, `%${search}%`));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      db.select().from(programs).where(whereClause).orderBy(
        sortOrder === 'asc' ? asc(programs[sortBy]) : desc(programs[sortBy])
      ).limit(limit).offset(offset),
      db.select({ count: count() }).from(programs).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/programs error:', error);
    return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = programCreateSchema.parse(body);

    const id = randomUUID();
    const now = new Date();

    const newProgram = {
      id,
      ...validated,
      policyReviewedAt: validated.policyReviewedAt ? new Date(validated.policyReviewedAt) : null,
      evaluationScoresJson: JSON.stringify(validated.evaluationScoresJson),
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(programs).values(newProgram);

    return NextResponse.json({ id, ...validated }, { status: 201 });
  } catch (error) {
    console.error('POST /api/programs error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create program' }, { status: 500 });
  }
}