"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, X } from "lucide-react";
import { programCreateSchema } from "@/lib/validation";
import { cn, calculateProgramScore } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { z } from "zod";

const defaultScores = {
  attackSurfaceUsefulness: 0,
  scopeClarity: 0,
  rewardSuitability: 0,
  productComplexity: 0,
  researchOpportunity: 0,
  skillFit: 0,
} as const;

const scoreDimensions = [
  { key: "attackSurfaceUsefulness", label: "Attack Surface Usefulness", description: "How useful is the attack surface for finding vulnerabilities?" },
  { key: "scopeClarity", label: "Scope Clarity", description: "How clear and well-defined is the program scope?" },
  { key: "rewardSuitability", label: "Reward Suitability", description: "Do the rewards match the effort required?" },
  { key: "productComplexity", label: "Product Complexity", description: "How complex is the application (more complexity = more opportunities)?" },
  { key: "researchOpportunity", label: "Research Opportunity", description: "Overall opportunity for novel research?" },
  { key: "skillFit", label: "Skill Fit", description: "How well does this match your current skills?" },
] as const;

// Form-specific schema that matches our form fields
const formSchema = programCreateSchema.extend({
  policyReviewedAt: z.string().optional(),
  researchStatus: z.enum(["inbox", "evaluating", "ready_to_investigate", "active_research", "paused", "archived"]).default("inbox"),
}).required();

type ProgramFormData = z.infer<typeof formSchema>;

interface ProgramInitialData {
  id?: string;
  name?: string;
  platform?: string;
  programUrl?: string;
  policyText?: string;
  policyReviewedAt?: string;
  researchStatus?: "inbox" | "evaluating" | "ready_to_investigate" | "active_research" | "paused" | "archived";
  evaluationScoresJson?: Record<string, number>;
  notes?: string;
}

export function ProgramForm({ mode, initialData }: { mode: "create" | "edit"; initialData?: ProgramInitialData }) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [scores, setScores] = useState<Record<string, number>>(initialData?.evaluationScoresJson || defaultScores);
  const { total, breakdown } = calculateProgramScore(scores);

  const form = useForm<ProgramFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      platform: "",
      programUrl: "",
      policyText: "",
      policyReviewedAt: undefined,
      researchStatus: "inbox",
      evaluationScoresJson: defaultScores,
      notes: "",
      ...initialData,
    },
  });

  const handleScoreChange = (key: keyof typeof defaultScores, value: number) => {
    const newScores = { ...scores, [key]: value };
    setScores(newScores);
    form.setValue("evaluationScoresJson", newScores, { shouldValidate: true });
  };

  const onSubmit = async (data: ProgramFormData) => {
    try {
      // Convert the policy reviewed date (if provided) to a full ISO‑8601 datetime,
      // because the API schema expects `z.string().datetime()`.
      const reviewedAt = data.policyReviewedAt
        ? new Date(data.policyReviewedAt).toISOString()
        : undefined;

      const programId = initialData?.id;
      const url = isEdit && programId ? `/api/programs/${programId}` : "/api/programs";
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          policyReviewedAt: reviewedAt,
          evaluationScoresJson: scores,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save program");
      }

      router.push(isEdit && programId ? `/programs/${programId}` : "/programs");
      router.refresh();
    } catch (error) {
      console.error("Failed to save program:", error);
      alert("Failed to save program. Please try again.");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/programs" className="p-2 rounded hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{isEdit ? "Edit Program" : "New Program"}</h1>
            <p className="text-muted-foreground">
              {isEdit ? "Update program details" : "Create a new bug bounty program record"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={isEdit && initialData?.id ? `/programs/${initialData.id}` : "/programs"} className="px-4 py-2 rounded-md border">
            <X className="h-4 w-4 mr-2" /> Cancel
          </Link>
          <Button type="submit" className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {isEdit ? "Save Changes" : "Create Program"}
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Program Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Example Corp Bug Bounty"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform">Platform *</Label>
              <Input
                id="platform"
                placeholder="e.g., Intigriti, HackerOne, Bugcrowd"
                {...form.register("platform")}
              />
              {form.formState.errors.platform && (
                <p className="text-sm text-red-600">{form.formState.errors.platform.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="programUrl">Program URL *</Label>
            <Input
              id="programUrl"
              type="url"
              placeholder="https://..."
              {...form.register("programUrl")}
            />
            {form.formState.errors.programUrl && (
              <p className="text-sm text-red-600">{form.formState.errors.programUrl.message}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="researchStatus">Research Status</Label>
              <Select
                value={form.watch("researchStatus")}
                onValueChange={(value) => form.setValue("researchStatus", value as "inbox" | "evaluating" | "ready_to_investigate" | "active_research" | "paused" | "archived")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbox">Inbox</SelectItem>
                  <SelectItem value="evaluating">Evaluating</SelectItem>
                  <SelectItem value="ready_to_investigate">Ready to Investigate</SelectItem>
                  <SelectItem value="active_research">Active Research</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            </div>
        </CardContent>
      </Card>

      {/* Policy */}
      <Card>
        <CardHeader>
          <CardTitle>Program Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="policyText">Policy Text</Label>
            <Textarea
              id="policyText"
              placeholder="Paste the program policy, rules, scope, exclusions, reward ranges, etc."
              rows={8}
              {...form.register("policyText")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Evaluation Scores */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Program Evaluation</CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">Total Score:</span>
              <span className="font-bold text-lg text-primary">{total.toFixed(1)} / 30</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Rate each dimension on a 0–5 scale. The total score is a personal prioritization tool, not a predictor of earnings.
          </p>

          <div className="space-y-6">
            {scoreDimensions.map((dim) => (
              <div key={dim.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={dim.key}>{dim.label}</Label>
                  <span className="font-mono text-lg text-primary">{scores[dim.key] ?? 0}</span>
                </div>
                <p className="text-sm text-muted-foreground">{dim.description}</p>
                <Slider
                  id={dim.key}
                  value={[scores[dim.key] ?? 0]}
                  onValueChange={(values: number[]) => handleScoreChange(dim.key, values[0] ?? 0)}
                  max={5}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 - None</span>
                  <span>3 - Moderate</span>
                  <span>5 - Excellent</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h4 className="font-medium mb-2">Score Breakdown</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(breakdown).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                  <span className="font-mono">{value.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional context, reminders, or personal observations..."
              rows={4}
              {...form.register("notes")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Actions */}
      <div className="flex items-center justify-end gap-4 border-t pt-6">
        <Link href={isEdit && initialData?.id ? `/programs/${initialData.id}` : "/programs"} className="px-4 py-2 rounded-md border">
          Cancel
        </Link>
        <Button type="submit" className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {isEdit ? "Save Changes" : "Create Program"}
        </Button>
      </div>
    </form>
  );
}