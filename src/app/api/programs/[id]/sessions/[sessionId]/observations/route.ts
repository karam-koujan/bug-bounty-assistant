import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { testObservations } from '@/lib/db/schema';
import { observationCreateSchema, observationListQuerySchema, observationParamsSchema, observationUpdateSchema } from '@/lib/validation';
import { eq, and, count, desc, asc, like } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id, sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const query = observationListQuerySchema.parse(Object.fromEntries(searchParams));

    const { page, limit, hypothesisId, conclusion, sortBy, sortOrder } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(testObservations.sessionId, sessionId)];
    if (hypothesisId) conditions.push(eq(testObservations.hypothesisId, hypothesisId));
    if (conclusion) conditions.push(like(testObservations.conclusion, `%${conclusion}%`));

    const whereClause = and(...conditions);

    const orderByColumn = (() => {
      switch (sortBy) {
        case "createdAt": return testObservations.createdAt;
        case "testDescription": return testObservations.testDescription;
        default: return testObservations.createdAt;
      }
    })();

    const [data, totalResult] = await Promise.all([
      db.select().from(testObservations).where(whereClause).orderBy(
        sortOrder === "asc" ? asc(orderByColumn) : desc(orderByColumn)
      ).limit(limit).offset(offset),
      db.select({ count: count() }).from(testObservations).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/programs/[id]/sessions/[sessionId]/observations error:", error);
    return NextResponse.json({ error: "Failed to fetch observations" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: programId, sessionId } = await params;
    const body = await request.json();
    const validated = observationCreateSchema.parse({ ...body, sessionId, programId });

    const newId = randomUUID();
    const newObservation = {
      id: newId,
      ...validated,
      evidenceIdsJson: JSON.stringify(validated.evidenceIdsJson),
      createdAt: new Date(),
    };

    await db.insert(testObservations).values(newObservation);

    return NextResponse.json({ id: newId, ...validated }, { status: 201 });
  } catch (error) {
    console.error("POST /api/programs/[id]/sessions/[sessionId]/observations error:", error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create observation" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string; observationId: string }> }
) {
  try {
    const { id: programId, sessionId, observationId } = await params;
    observationParamsSchema.parse({ id: observationId });
    const body = await request.json();
    const validated = observationUpdateSchema.parse(body);

    const updateData: Record<string, unknown> = { ...validated };
    if (validated.evidenceIdsJson) updateData.evidenceIdsJson = JSON.stringify(validated.evidenceIdsJson);

    const result = await db.update(testObservations).set(updateData).where(
      and(eq(testObservations.id, observationId), eq(testObservations.sessionId, sessionId), eq(testObservations.programId, programId))
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: "Observation not found" }, { status: 404 });
    }

    return NextResponse.json({ id: observationId, ...validated });
  } catch (error) {
    console.error("PATCH /api/programs/[id]/sessions/[sessionId]/observations/[observationId] error:", error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update observation" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string; observationId: string }> }
) {
  try {
    const { id: programId, sessionId, observationId } = await params;
    observationParamsSchema.parse({ id: observationId });

    const result = await db.delete(testObservations).where(
      and(eq(testObservations.id, observationId), eq(testObservations.sessionId, sessionId), eq(testObservations.programId, programId))
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: "Observation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/programs/[id]/sessions/[sessionId]/observations/[observationId] error:", error);
    return NextResponse.json({ error: "Failed to delete observation" }, { status: 500 });
  }
}