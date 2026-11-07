import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { reportDraftRequestSchema, reportParamsSchema } from '@/lib/validation/reports';
import { ReportBuilderService, ReportError } from '@/lib/services/report';

/**
 * POST /api/programs/[id]/reports/draft (M6.2):
 * 1. Requires a CONFIRMED-finding hypothesis.
 * 2. Sends hypothesis + supporting evidence + recorded observations to the AI.
 * 3. Validates the structured draft and every evidence reference against real records.
 * 4. Persists the draft for human review and logs an ai_runs audit entry.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = reportParamsSchema.parse(await params);
    const body = await request.json();
    const { hypothesisId } = reportDraftRequestSchema.parse(body);

    const service = new ReportBuilderService();
    const draft = await service.draftReportFromHypothesis(programId, hypothesisId);
    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    console.error('POST /api/programs/[id]/reports/draft error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    if (error instanceof ReportError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Report drafting failed' },
      { status: 500 }
    );
  }
}
