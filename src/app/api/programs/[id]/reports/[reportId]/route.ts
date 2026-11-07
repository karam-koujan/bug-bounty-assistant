import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { reportPathParamsSchema } from '@/lib/validation/reports';
import { ReportBuilderService, ReportError } from '@/lib/services/report';

/** GET/PATCH/DELETE /api/programs/[id]/reports/[reportId] */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const { id: programId, reportId } = reportPathParamsSchema.parse(await params);
    const service = new ReportBuilderService();
    const report = await service.getReport(programId, reportId);
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    return NextResponse.json({ data: report });
  } catch (error) {
    console.error('GET /api/programs/[id]/reports/[reportId] error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const { id: programId, reportId } = reportPathParamsSchema.parse(await params);
    const body = await request.json();
    const service = new ReportBuilderService();
    const updated = await service.updateReport(programId, reportId, body);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/programs/[id]/reports/[reportId] error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    if (error instanceof ReportError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const { id: programId, reportId } = reportPathParamsSchema.parse(await params);
    const service = new ReportBuilderService();
    const deleted = await service.deleteReport(programId, reportId);
    if (!deleted) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/programs/[id]/reports/[reportId] error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
  }
}
