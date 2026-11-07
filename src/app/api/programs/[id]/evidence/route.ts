import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evidence } from '@/lib/db/schema';
import { evidenceCreateSchema, evidenceListQuerySchema, evidenceParamsSchema } from '@/lib/validation';
import { eq, and, count, desc, asc, like } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';
import { createHash } from 'crypto';
import { redactEvidenceText } from '@/lib/security/redaction';

function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = evidenceParamsSchema.parse(await params);
    const { searchParams } = new URL(request.url);
    const query = evidenceListQuerySchema.parse(Object.fromEntries(searchParams));

    const { page, limit, type, verificationStatus, search, sortBy, sortOrder } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(evidence.programId, programId)];
    if (type) conditions.push(eq(evidence.evidenceType, type));
    if (verificationStatus) conditions.push(eq(evidence.verificationStatus, verificationStatus));
    if (search) conditions.push(like(evidence.title, `%${search}%`));

    const whereClause = and(...conditions);

    const [data, totalResult] = await Promise.all([
      db.select().from(evidence).where(whereClause).orderBy(
        sortOrder === 'asc' ? asc(evidence[sortBy]) : desc(evidence[sortBy])
      ).limit(limit).offset(offset),
      db.select({ count: count() }).from(evidence).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/programs/[id]/evidence error:', error);
    return NextResponse.json({ error: 'Failed to fetch evidence' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = evidenceParamsSchema.parse(await params);
    const body = await request.json();
    const validated = evidenceCreateSchema.parse({ ...body, programId });

    // M7.2 — Untrusted HTTP evidence always passes through secret redaction
    // before hashing/storage, so raw cookies/tokens never enter the research DB.
    let content = validated.content;
    let redactedFields: string[] = [];
    if (validated.evidenceType === 'http_request' || validated.evidenceType === 'http_response') {
      const redacted = redactEvidenceText(content);
      content = redacted.content;
      redactedFields = redacted.redactions.map((r) => r.field);
    }

    const contentHash = generateContentHash(content);

    // Check for existing evidence with same content hash (deduplication)
    const existing = await db.select().from(evidence).where(
      and(eq(evidence.programId, programId), eq(evidence.contentHash, contentHash))
    ).limit(1);

    if (existing.length > 0) {
      const existingEvidence = existing[0];
      if (existingEvidence) {
        const { id: _, ...rest } = existingEvidence;
        return NextResponse.json(
          { id: existingEvidence.id, ...rest, deduplicated: true },
          { status: 200 }
        );
      }
    }

    const id = randomUUID();
    const now = new Date();

    const newEvidence = {
      id,
      ...validated,
      content,
      contentHash,
      collectedAt: validated.collectedAt ? new Date(validated.collectedAt) : now,
      metadataJson: JSON.stringify({
        ...(validated.metadataJson ?? {}),
        ...(redactedFields.length > 0 ? { redactedFields } : {}),
      }),
    };

    await db.insert(evidence).values(newEvidence);

    return NextResponse.json({ id, ...validated, content, contentHash }, { status: 201 });
  } catch (error) {
    console.error('POST /api/programs/[id]/evidence error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create evidence' }, { status: 500 });
  }
}