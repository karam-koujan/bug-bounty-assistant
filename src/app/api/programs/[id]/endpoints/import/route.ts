import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { endpoints, assets, features } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';
import { endpointCreateSchema } from '@/lib/validation';

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  
  const firstLine = lines[0];
  if (!firstLine) return [];
  
  const headers = firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.replace(/^"|"$/g, '') || '';
    });
    rows.push(row);
  }
  
  return rows;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = await params;
    const contentType = request.headers.get('content-type') || '';
    
    let rows: Record<string, string>[] = [];
    
    if (contentType.includes('text/csv')) {
      const csv = await request.text();
      rows = parseCSV(csv);
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      if (Array.isArray(body)) {
        rows = body;
      } else if (body.endpoints && Array.isArray(body.endpoints)) {
        rows = body.endpoints;
      } else {
        return NextResponse.json({ error: 'Invalid JSON format. Expected array or { endpoints: [] }' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Content-Type must be text/csv or application/json' }, { status: 400 });
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No data to import' }, { status: 400 });
    }

    // Fetch assets and features for validation
    const [assetsList, featuresList] = await Promise.all([
      db.select({ id: assets.id, assetIdentifier: assets.assetIdentifier }).from(assets).where(eq(assets.programId, programId)),
      db.select({ id: features.id, name: features.name }).from(features).where(eq(features.programId, programId)),
    ]);

    const assetMap = new Map(assetsList.map(a => [a.assetIdentifier.toLowerCase(), a.id]));
    const featureMap = new Map(featuresList.map(f => [f.name.toLowerCase(), f.id]));

    const results = {
      created: 0,
      errors: [] as { row: number; error: string }[],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      try {
        // Map CSV/JSON fields to endpoint schema (case-insensitive)
        const getField = (obj: Record<string, string> | undefined, ...keys: string[]): string => {
          if (!obj) return '';
          for (const key of keys) {
            const val = obj[key];
            if (val !== undefined && val !== '') return val;
          }
          return '';
        };

        const method = getField(row, 'method', 'Method', 'HTTP_METHOD').toUpperCase() || 'GET';
        const pathTemplate = getField(row, 'pathTemplate', 'Path', 'path', 'Path_Template');
        const assetIdentifier = getField(row, 'assetId', 'Asset', 'asset', 'Asset_Identifier');
        const featureName = getField(row, 'featureId', 'Feature', 'feature', 'Feature_Name');
        const purpose = getField(row, 'purpose', 'Purpose');
        const authenticationRequirement = getField(row, 'authenticationRequirement', 'Auth', 'Authentication');
        const expectedAuthorization = getField(row, 'expectedAuthorization', 'Authorization', 'Expected_Auth');
        const testStatus = (getField(row, 'testStatus', 'Status') || 'untested').toLowerCase();
        const notes = getField(row, 'notes', 'Notes');

        if (!pathTemplate) {
          results.errors.push({ row: rowNum, error: 'Missing required field: pathTemplate' });
          continue;
        }

        const assetId = assetIdentifier ? assetMap.get(assetIdentifier.toLowerCase()) || null : null;
        const featureId = featureName ? featureMap.get(featureName.toLowerCase()) || null : null;

        const validated = endpointCreateSchema.parse({
          programId,
          assetId,
          featureId,
          method,
          pathTemplate,
          purpose: purpose || null,
          authenticationRequirement: authenticationRequirement || null,
          expectedAuthorization: expectedAuthorization || null,
          testStatus,
          notes: notes || null,
        });

        const id = randomUUID();
        await db.insert(endpoints).values({
          id,
          ...validated,
          method: validated.method.toUpperCase(),
        });

        results.created++;
      } catch (error) {
        if (error instanceof ZodError) {
          results.errors.push({ row: rowNum, error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ') });
        } else {
          results.errors.push({ row: rowNum, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    }

    return NextResponse.json(results, { status: results.errors.length > 0 ? 207 : 201 });
  } catch (error) {
    console.error('POST /api/programs/[id]/endpoints/import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}