"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { redactText } from "@/lib/security/redaction";

/**
 * Redaction preview field (Milestone 7.3).
 *
 * Shows live detection of secrets/PII in the content field with the redactions
 * highlighted, and lets the researcher apply redaction before saving.
 */
export function RedactionAwareContentField({
  value,
  onChange,
  id = "content",
}: {
  value: string;
  onChange: (next: string) => void;
  id?: string;
}) {
  const preview = useMemo(() => redactText(value), [value]);
  const hasRedactions = preview.redactions.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>Observed Fact *</Label>
        {hasRedactions && (
          <Badge variant="destructive" className="gap-1">
            <ShieldCheck className="h-3 w-3" aria-hidden />
            {preview.redactions.reduce((n, r) => n + r.count, 0)} possible secret(s) detected
          </Badge>
        )}
      </div>

      <Textarea
        id={id}
        placeholder="Describe what you observed. Be specific and factual."
        rows={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />

      {hasRedactions && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          <p className="mb-2 font-medium text-amber-700 dark:text-amber-400">
            Potential secrets detected. Review before saving:
          </p>
          <ul className="mb-2 space-y-0.5 text-xs text-muted-foreground">
            {preview.redactions.map((r) => (
              <li key={r.field}>
                <code className="rounded bg-muted px-1">{r.field}</code> ({r.category}) — {r.count} occurrence(s)
              </li>
            ))}
          </ul>
          <p className="mb-2 rounded bg-muted/50 p-2 font-mono text-xs whitespace-pre-wrap">
            {preview.content.split("[REDACTED]").flatMap((part, i, arr) => [
              <span key={`p${i}`}>{part}</span>,
              ...(i < arr.length - 1 ? [<mark key={`m${i}`} className="rounded bg-amber-400/60 px-0.5 text-foreground">[REDACTED]</mark>] : []),
            ])}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onChange(preview.content)}
            >
              Apply redactions to content
            </Button>
            <span className="text-xs text-muted-foreground">
              Or review and edit manually — nothing is redacted without your action.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
