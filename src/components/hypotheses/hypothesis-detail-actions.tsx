"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, FileText, ShieldCheck } from "lucide-react";
import { hypothesisStatusTransitions } from "@/lib/validation/hypotheses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const NEXT_ACTION_LABEL: Record<string, string> = {
  needs_evidence: "Mark Needs Evidence",
  ready_for_review: "Submit for Review",
  approved_for_testing: "Approved for Testing (via gate)",
  testing_in_progress: "Start Testing",
  supported_by_evidence: "Mark Supported by Evidence",
  disproved_by_test: "Mark Disproved",
  inconclusive: "Mark Inconclusive",
  confirmed_finding: "Mark Confirmed Finding",
  rejected: "Reject",
  archived: "Archive",
};

export function HypothesisDetailActions({
  programId,
  hypothesisId,
  hypothesisStatus,
}: {
  programId: string;
  hypothesisId: string;
  hypothesisStatus: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(hypothesisStatus);

  const transition = async (nextStatus: string, viaGate = false) => {
    setBusy(nextStatus);
    setError(null);
    try {
      if (viaGate) {
        // Testing & confirmed transitions go through the PolicyApprovalGate.
        const res = await fetch(`/api/ai/approval`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hypothesisId, status: "approved", decidedBy: "researcher", notes: `Transitions to ${nextStatus}` }),
        });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error ?? "Approval gate refused the transition");
        }
      }
      const res = await fetch(`/api/programs/${programId}/hypotheses/${hypothesisId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, reason: `Researcher transition to ${nextStatus}` }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Transition failed");
      }
      setStatus(nextStatus);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transition failed.");
    } finally {
      setBusy(null);
    }
  };

  // Build the list of statuses reachable from the current state via the transition map.
  const allOptions = (hypothesisStatusTransitions[status] ?? []).filter((s) => s !== status);

  // Gates are statuses that may only be set via the PolicyApprovalGate.
  const gateStates = new Set(["testing_in_progress", "confirmed_finding", "supported_by_evidence"]);

  // Filter out any gated option unless the hypothesis is already in that state.
  const options = allOptions.filter((s) => {
    if (gateStates.has(s) && s !== status) return false; // gated and not current -> hide
    return true;
  });

  return (
    <Card>
      <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          {options.map((s) => {
            const viaGate = gateStates.has(s) && s !== status;
            if (viaGate) return null; // gated actions rendered separately below
            return (
              <Button
                key={s}
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => transition(s)}
              >
                {busy === s && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {NEXT_ACTION_LABEL[s] ?? s}
              </Button>
            );
          })}

          {/* "Approve for Testing" button – only shown when status is not already approved_for_testing */}
          {status !== "approved_for_testing" && (
            <Button
              size="sm"
              disabled={busy !== null}
              onClick={() => transition("approved_for_testing", true)}
            >
              <ShieldCheck className="h-4 w-4 mr-1" />
              <FileText className="hidden" />
              {busy === "approved_for_testing" && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Approve for Testing
            </Button>
          )}

          {/* "Start Testing (gate)" – only when transition to testing_in_progress is allowed */}
          {options.includes("testing_in_progress") && (
            <Button
              size="sm"
              disabled={busy !== null}
              onClick={() => transition("testing_in_progress", true)}
            >
              <ShieldCheck className="h-4 w-4 mr-1" />
              Start Testing (gate)
            </Button>
          )}

          {/* "Confirm Finding" – only when transition to confirmed_finding is allowed and not already there */}
          {status !== "confirmed_finding" && options.includes("confirmed_finding") && (
            <Button
              size="sm"
              disabled={busy !== null}
              onClick={() => transition("confirmed_finding", true)}
            >
              <ShieldCheck className="h-4 w-4 mr-1" />
              Confirm Finding
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-xs text-muted-foreground">
          Approvals and confirmations are recorded through the PolicyApprovalGate — AI outputs can
          recommend, but never silently change, these statuses.
        </p>
      </CardContent>
    </Card>
  );
}
