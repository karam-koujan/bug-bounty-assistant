import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import { db } from '@/lib/db';
import { hypotheses, aiRuns, evidence } from '@/lib/db/schema';
import {
  hypothesisPathParamsSchema,
  hypothesisUpdateSchema,
  hypothesisTransitionBodySchema,
  hypothesisStatusTransitions,
  hypothesisParamsSchema,
} from '@/lib/validation/hypotheses';

/** GET/PATCH/DELETE /api/programs/[id]/hypotheses/[hypothesisId] (M4.11). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; hypothesisId: string }> }
) {
  try {
    const { id: programId, hypothesisId } = hypothesisPathParamsSchema.parse(await params);
    const found = (
      await db
        .select()
        .from(hypotheses)
        .where(and(eq(hypotheses.id, hypothesisId), eq(hypotheses.programId, programId)))
        .limit(1)
    )[0];
    if (!found) return NextResponse.json({ error: 'Hypothesis not found' }, { status: 404 });
    return NextResponse.json({ data: found });
  } catch (error) {
    console.error('GET /api/programs/[id]/hypotheses/[hypothesisId] error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch hypothesis' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; hypothesisId: string }> }
) {
  try {
    const { id: programId, hypothesisId } = hypothesisPathParamsSchema.parse(await params);
    const body = await request.json();

    const existing = (
      await db
        .select()
        .from(hypotheses)
        .where(and(eq(hypotheses.id, hypothesisId), eq(hypotheses.programId, programId)))
        .limit(1)
    )[0];
    if (!existing) return NextResponse.json({ error: 'Hypothesis not found' }, { status: 404 });

    // Status changes go through the lifecycle map; confirmed findings are
    // protected and require the researcher (see transition rules).
    let updateData: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if ('status' in body && body.status !== undefined) {
      const transition = hypothesisTransitionBodySchema.parse(body);
      const allowed = hypothesisStatusTransitions[existing.status] ?? [];
      if (!allowed.includes(transition.status)) {
        return NextResponse.json(
          { error: `Invalid status transition: ${existing.status} → ${transition.status}` },
          { status: 409 }
        );
      }
      // Transitions into testing/confirmed must come from the approval gate
      // (researcher decision), not from a generic edit.
      if (
        transition.status !== existing.status &&
        ['testing_in_progress', 'confirmed_finding', 'supported_by_evidence'].includes(transition.status) &&
        !transition.reason
      ) {
        return NextResponse.json(
          { error: 'Moving a hypothesis into testing/confirmed states requires the approval gate' },
          { status: 409 }
        );
      }
      // approved_for_testing may only be set via the approval gate, never a generic PATCH.
      if (transition.status === 'approved_for_testing') {
        return NextResponse.json(
          { error: 'Status approved_for_testing can only be set via the approval gate.' },
          { status: 409 }
        );
      }
      // For any gated status, a prior approval record must exist in ai_runs for this hypothesis.
      const gatedStatuses = [
        'approved_for_testing',
        'testing_in_progress',
        'confirmed_finding',
        'supported_by_evidence',
      ];
      if (gatedStatuses.includes(transition.status)) {
        const approval = await db.query.aiRuns.findFirst({
          where: and(
            eq(aiRuns.hypothesisId, hypothesisId),
            eq(aiRuns.taskType, 'hypothesis_approval'),
          ),
        });
        if (!approval) {
          return NextResponse.json(
            { error: `Status ${transition.status} requires an approval gate decision. No approval record found.` },
            { status: 409 }
          );
        }
      }
      // Enforce evidence requirements for supported_by_evidence and confirmed_finding.
      if (['supported_by_evidence', 'confirmed_finding'].includes(transition.status)) {
        const evidenceIds = existing.supportingEvidenceJson ?? [];
        if (!Array.isArray(evidenceIds) || evidenceIds.length === 0) {
          return NextResponse.json(
            { error: 'At least one supporting evidence ID is required for this status.' },
            { status: 409 }
          );
        }
        for (const id of evidenceIds) {
          const uuidPattern = /^[0-9a-f-]{36}$/i;
          if (!uuidPattern.test(id)) {
            return NextResponse.json(
              { error: `Invalid evidence ID format: ${id}` },
              { status: 409 }
            );
          }
          const ev = await db.query.evidence.findFirst({
            where: and(eq(evidence.id, id), eq(evidence.programId, programId)),
          });
          if (!ev) {
            return NextResponse.json(
              { error: `Evidence ID "${id}" not found or does not belong to this program.` },
              { status: 409 }
            );
          }
        }
      }
    }

    const validated = hypothesisUpdateSchema.parse(body);
    updateData = { ...body, updatedAt: new Date() };
    if (validated.supportingEvidenceJson) {
      updateData.supportingEvidenceJson = JSON.stringify(validated.supportingEvidenceJson);
    }
    if (validated.contradictingEvidenceJson) {
      updateData.contradictingEvidenceJson = JSON.stringify(validated.contradictingEvidenceJson);
    }
    if (validated.assumptionsJson) updateData.assumptionsJson = JSON.stringify(validated.assumptionsJson);
    if (validated.prerequisitesJson) updateData.prerequisitesJson = JSON.stringify(validated.prerequisitesJson);
    if (validated.priorityBreakdownJson) {
      updateData.priorityBreakdownJson = JSON.stringify(validated.priorityBreakdownJson);
    }
    // Status already validated against the transition map above.
    delete updateData.status;

    const statusValidated = hypothesisTransitionBodySchema.parse({ status: body.status ?? existing.status });
    updateData.status = statusValidated.status;

    await db.update(hypotheses).set(updateData).where(eq(hypotheses.id, hypothesisId));
    return NextResponse.json({ id: hypothesisId, ...validated });
  } catch (error) {
    console.error('PATCH /api/programs/[id]/hypotheses/[hypothesisId] error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update hypothesis' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; hypothesisId: string }> }
) {
  try {
    const { id: programId, hypothesisId } = hypothesisPathParamsSchema.parse(await params);
    const result = await db
      .delete(hypotheses)
      .where(and(eq(hypotheses.id, hypothesisId), eq(hypotheses.programId, programId)));
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Hypothesis not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/programs/[id]/hypotheses/[hypothesisId] error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to delete hypothesis' }, { status: 500 });
  }
}
