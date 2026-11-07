import { NextRequest, NextResponse } from 'next/server';
import { getPolicyApprovalGate } from '@/lib/services/approval-gate';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = await params;
    const body = await request.json();
    const { hypothesisId, status, decidedBy, notes } = body;

    if (!hypothesisId || !status || !decidedBy) {
      return NextResponse.json(
        { error: 'hypothesisId, status, and decidedBy are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['approved', 'rejected', 'pending'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const gate = await getPolicyApprovalGate();

    // Request approval check first
    const check = await gate.requestApproval({
      hypothesisId,
      programId,
      requestedBy: decidedBy,
      reason: notes || 'Manual approval request',
    });

    if (check.required && check.status === 'rejected' && status === 'approved') {
      return NextResponse.json(
        { error: `Cannot approve: ${check.reason}` },
        { status: 400 }
      );
    }

    // Record the decision
    await gate.approve({
      hypothesisId,
      status: status === 'approved' ? 'approved' : 'rejected',
      decidedBy,
      decidedAt: new Date(),
      notes,
    });

    const newStatus = await gate.getApprovalStatus(hypothesisId);

    return NextResponse.json({
      hypothesisId,
      status: newStatus,
      decidedBy,
      decidedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Approval error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Approval failed' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = await params;
    const { searchParams } = new URL(request.url);
    const hypothesisId = searchParams.get('hypothesisId');

    if (!hypothesisId) {
      return NextResponse.json({ error: 'hypothesisId query parameter is required' }, { status: 400 });
    }

    const gate = await getPolicyApprovalGate();
    const status = await gate.getApprovalStatus(hypothesisId);

    return NextResponse.json({ hypothesisId, status });
  } catch (error) {
    console.error('Get approval status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get approval status' },
      { status: 500 }
    );
  }
}