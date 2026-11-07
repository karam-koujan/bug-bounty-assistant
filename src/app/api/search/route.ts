import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evidence, programs, hypotheses, assets } from '@/lib/db/schema';
import { eq, and, count, desc, like, sql } from 'drizzle-orm';
import { ZodError } from 'zod';
import Database from 'better-sqlite3';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    // Search evidence using FTS5 - filter terms with min length 2
    const terms = q.split(' ').filter(t => t.length >= 2);
    if (terms.length === 0) {
      return NextResponse.json({ results: [] });
    }
    const ftsQuery = terms.map(term => `${term}*`).join(' ');

    // Use raw SQLite for FTS5 query via Drizzle's $client
    const sqlite = db.$client as Database.Database;
    const evidenceRows = sqlite.prepare(`
      SELECT e.id, e.program_id, e.evidence_type, e.title, e.content, e.source_url, e.collected_at, e.verification_status,
             bm25(evidence_fts) as rank
      FROM evidence_fts
      JOIN evidence e ON e.rowid = evidence_fts.rowid
      WHERE evidence_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(ftsQuery, limit);

    // Search programs
    const programResults = await db.select({
      id: programs.id,
      name: programs.name,
      platform: programs.platform,
      programUrl: programs.programUrl,
      researchStatus: programs.researchStatus,
    }).from(programs).where(
      like(programs.name, `%${q}%`)
    ).limit(limit);

    // Search hypotheses
    const hypothesisResults = await db.select({
      id: hypotheses.id,
      programId: hypotheses.programId,
      title: hypotheses.title,
      statement: hypotheses.statement,
      category: hypotheses.category,
      status: hypotheses.status,
      priorityScore: hypotheses.priorityScore,
    }).from(hypotheses).where(
      like(hypotheses.title, `%${q}%`)
    ).limit(limit);

    // Search assets
    const assetResults = await db.select({
      id: assets.id,
      programId: assets.programId,
      assetIdentifier: assets.assetIdentifier,
      assetType: assets.assetType,
      scopeStatus: assets.scopeStatus,
    }).from(assets).where(
      like(assets.assetIdentifier, `%${q}%`)
    ).limit(limit);

    // Format results grouped by type
    const results = [
      { type: 'evidence', label: 'Evidence', count: evidenceRows.length, data: evidenceRows },
      { type: 'programs', label: 'Programs', count: programResults.length, data: programResults },
      { type: 'hypotheses', label: 'Hypotheses', count: hypothesisResults.length, data: hypothesisResults },
      { type: 'assets', label: 'Assets', count: assetResults.length, data: assetResults },
    ].filter(r => r.count > 0);

    return NextResponse.json({ results, query: q });
  } catch (error) {
    console.error('GET /api/search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}