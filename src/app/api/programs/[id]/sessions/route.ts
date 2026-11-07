import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { researchSessions } from '@/lib/db/schema';
import { sessionCreateSchema, sessionListQuerySchema, sessionParamsSchema, sessionUpdateSchema } from '@/lib/validation';
import { eq, and, count, desc, asc, like } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = sessionParamsSchema.parse(await params);
    const { searchParams } = new URL(request.url);
    const query = sessionListQuerySchema.parse(Object.fromEntries(searchParams));

    const { page, limit, hypothesisId, search, sortBy, sortOrder } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(researchSessions.programId, id)];
    if (hypothesisId) conditions.push(eq(researchSessions.hypothesisId, hypothesisId));
    if (search) conditions.push(like(researchSessions.objective, `%${search}%`));

    const whereClause = and(...conditions);

    const orderByColumn = (() => {
      switch (sortBy) {
        case "objective": return researchSessions.objective;
        case "startedAt": return researchSessions.startedAt;
        default: return researchSessions.startedAt;
      }
    })();

    const [data, totalResult] = await Promise.all([
      db.select().from(researchSessions).where(whereClause).orderBy(
        sortOrder === "asc" ? asc(orderByColumn) : desc(orderByColumn)
      ).limit(limit).offset(offset),
      db.select({ count: count() }).from(researchSessions).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/programs/[id]/sessions error:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = sessionParamsSchema.parse(await params);
    const body = await request.json();
    const validated = sessionCreateSchema.parse({ ...body, programId });

    const id = randomUUID();
    const newSession = {
      id,
      ...validated,
      nextStepsJson: JSON.stringify(validated.nextStepsJson),
      startedAt: new Date(),
    };

    await db.insert(researchSessions).values(newSession);

    return NextResponse.json({ id, ...validated }, { status: 201 });
  } catch (error) {
    console.error("POST /api/programs/[id]/sessions error:", error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: programId, sessionId } = await params;
    sessionParamsSchema.parse({ id: sessionId });
    const body = await request.json();
    const validated = sessionUpdateSchema.parse(body);

    const updateData: Record<string, unknown> = { ...validated };
    if (validated.nextStepsJson) updateData.nextStepsJson = JSON.stringify(validated.nextStepsJson);
    updateData.updatedAt = new Date();

    const result = await db.update(researchSessions).set(updateData).where(
      and(eq(researchSessions.id, sessionId), eq(researchSessions.programId, programId))
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ id: sessionId, ...validated });
  } catch (error) {
    console.error("PATCH /api/programs/[id]/sessions/[sessionId] error:", error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: programId, sessionId } = await params;
    sessionParamsSchema.parse({ id: sessionId });

    const result = await db.delete(researchSessions).where(
      and(eq(researchSessions.id, sessionId), eq(researchSessions.programId, programId))
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/programs/[id]/sessions/[sessionId] error:", error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}