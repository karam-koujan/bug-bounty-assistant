import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { reportPathParamsSchema } from '@/lib/validation/reports';
import { ReportBuilderService } from '@/lib/services/report';

/** GET /api/programs/[id]/reports/[reportId]/export — Markdown export (M6.6). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const { id: programId, reportId } = reportPathParamsSchema.parse(await params);
    const service = new ReportBuilderService();
    const markdown = await service.exportMarkdown(programId, reportId);
    if (markdown === null) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${reportId}.md"`,
      },
    });
  } catch (error) {
    console.error('GET /api/programs/[id]/reports/[reportId]/export error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to export report' }, { status: 500 });
  }
}
