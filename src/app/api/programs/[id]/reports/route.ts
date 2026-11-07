import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { reportParamsSchema } from '@/lib/validation/reports';
import { ReportBuilderService, ReportError } from '@/lib/services/report';

/** GET/POST /api/programs/[id]/reports */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = reportParamsSchema.parse(await params);
    const { searchParams } = new URL(request.url);
    const service = new ReportBuilderService();
    const result = await service.listReports(id, Object.fromEntries(searchParams));
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/programs/[id]/reports error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = reportParamsSchema.parse(await params);
    const body = await request.json();
    const service = new ReportBuilderService();
    const created = await service.createReport(programId, body);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/programs/[id]/reports error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    if (error instanceof ReportError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}
