/**
 * Security test cases (Milestone 7.11) — invariants from Architecture.md
 * "Hard Restrictions" applied to the codebase itself:
 *   - the AI adapter has no file access, no command execution capability;
 *   - untrusted HTML is never rendered (no dangerouslySetInnerHTML);
 *   - AI routes never hand db handles / raw SQL to model output.
 * Combined with test/integration/security-scope.test.ts (scope bypass +
 * cross-program isolation) this covers the M7.11 checklist.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const repo = path.resolve(__dirname, '../../..');
const readSrc = (rel: string) => readFileSync(path.join(repo, rel), 'utf-8');

describe('AI adapter attack surface (M7.11)', () => {
  it('never imports child_process, exec, or shell modules', () => {
    const src = readSrc('src/lib/ai/adapter.ts');
    expect(src).not.toMatch(/child_process|execSync|spawnSync/);
  });

  it('never imports fs for file access', () => {
    const src = readSrc('src/lib/ai/adapter.ts');
    expect(src).not.toMatch(/from ['"]node:fs['"]|from ['"]fs['"]|readFileSync/);
  });

  it('contains no dynamic code execution', () => {
    const src = readSrc('src/lib/ai/adapter.ts');
    expect(src).not.toMatch(/\beval\(|new Function\(/);
  });
});

describe('untrusted HTML is never rendered (M7.11)', () => {
  it('no component uses dangerouslySetInnerHTML', () => {
    const offenders: string[] = [];
    const walk = (abs: string) => {
      if (!existsSync(abs)) return;
      for (const entry of readdirSync(abs, { withFileTypes: true })) {
        const child = path.join(abs, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules') walk(child);
        else if (/\.tsx$/.test(entry.name)) {
          if (/dangerouslySetInnerHTML/.test(readFileSync(child, 'utf-8'))) offenders.push(child);
        }
      }
    };
    walk(path.join(repo, 'src/components'));
    walk(path.join(repo, 'src/app'));
    expect(offenders).toEqual([]);
  });
});

describe('model cannot mutate DB or access files through AI routes (M7.11)', () => {
  it('AI routes never pass db handles or SQL into model-called code', () => {
    for (const f of ['generate-hypotheses', 'analyze-feature', 'draft-report']) {
      const src = readSrc(`src/app/api/ai/${f}/route.ts`);
      // Provider calls receive plain data; no db/SQL string is embedded into prompts.
      expect(src).not.toMatch(/new Database\(|\.exec\(|raw\(/);
    }
  });

  it('redaction library is applied at evidence ingest (secret logging guard)', () => {
    expect(readSrc('src/lib/security/redaction.ts')).toMatch(/redactText/);
    const evidenceRoute = readSrc('src/app/api/programs/[id]/evidence/route.ts');
    expect(evidenceRoute).toMatch(/redactEvidenceText|redact/);
  });
});
