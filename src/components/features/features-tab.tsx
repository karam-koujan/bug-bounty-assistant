"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Shield, FileText, Loader2, Link as LinkIcon, ExternalLink } from "lucide-react";
import { featureCreateSchema, featureListQuerySchema } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

interface Feature {
  id: string;
  programId: string;
  assetId: string | null;
  name: string;
  description: string | null;
  rolesJson: string;
  resourceTypesJson: string;
  expectedSecurityPropertiesJson: string;
  notes: string | null;
}

interface FeaturesTabProps {
  programId: string;
  initialFeatures?: Feature[];
  initialAssets?: { id: string; assetIdentifier: string }[];
}

const featureFormSchema = featureCreateSchema.omit({ programId: true }).extend({
  name: z.string().min(1, "Feature name is required"),
  rolesJson: z.array(z.string()).default([]),
  resourceTypesJson: z.array(z.string()).default([]),
  expectedSecurityPropertiesJson: z.array(z.string()).default([]),
});

type FeatureFormData = z.infer<typeof featureFormSchema>;

export function FeaturesTab({ programId, initialFeatures = [], initialAssets = [] }: FeaturesTabProps) {
  const router = useRouter();
  const [features, setFeatures] = useState<Feature[]>(initialFeatures);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ assetId: "", search: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  const fetchFeatures = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...filters,
      });
      const res = await fetch(`/api/programs/${programId}/features?${params}`);
      const data = await res.json();
      setFeatures(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch features:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: FeatureFormData) => {
    try {
      const res = await fetch(`/api/programs/${programId}/features`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          assetId: data.assetId || null,
          rolesJson: data.rolesJson,
          resourceTypesJson: data.resourceTypesJson,
          expectedSecurityPropertiesJson: data.expectedSecurityPropertiesJson,
          notes: data.notes,
        }),
      });

      if (!res.ok) throw new Error("Failed to save feature");

      router.refresh();
    } catch (error) {
      console.error("Failed to save feature:", error);
      alert("Failed to save feature. Please try again.");
    }
  };

  const handleDelete = async (featureId: string) => {
    if (!confirm("Delete this feature?")) return;
    try {
      const res = await fetch(`/api/programs/${programId}/features/${featureId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete feature");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete feature:", error);
      alert("Failed to delete feature.");
    }
  };

  const parseJsonArray = (json: string): string[] => {
    try { return JSON.parse(json); } catch { return []; }
  };

  const formatJsonArray = (arr: string[]): string => arr.join(", ");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Features</h2>
          <p className="text-muted-foreground">Map application features and their security properties</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Feature
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Feature</DialogTitle>
            </DialogHeader>
            <FeatureForm onSubmit={handleSubmit} assets={initialAssets} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Input
                placeholder="Search features..."
                value={filters.search}
                onChange={e => { setFilters(prev => ({ ...prev, search: e.target.value })); setCurrentPage(1); }}
              />
            </div>
            <Select value={filters.assetId} onValueChange={value => { setFilters(prev => ({ ...prev, assetId: value })); setCurrentPage(1); }}>
              <SelectTrigger className="w-[250px]"><SelectValue placeholder="Filter by asset" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Assets</SelectItem>
                {initialAssets.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.assetIdentifier}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Features</CardTitle>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        </CardHeader>
        <CardContent>
          {features.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No features defined. Click "Add Feature" to start.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Resource Types</TableHead>
                    <TableHead>Security Properties</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {features.map((feature: Feature) => {
                    const asset = initialAssets.find(a => a.id === feature.assetId);
                    const roles = parseJsonArray(feature.rolesJson);
                    const resourceTypes = parseJsonArray(feature.resourceTypesJson);
                    const securityProps = parseJsonArray(feature.expectedSecurityPropertiesJson);
                    return (
                      <TableRow key={feature.id}>
                        <TableCell className="font-medium">{feature.name}</TableCell>
                        <TableCell>{asset?.assetIdentifier || "—"}</TableCell>
                        <TableCell><Badge variant="secondary">{formatJsonArray(roles) || "—"}</Badge></TableCell>
                        <TableCell><Badge variant="secondary">{formatJsonArray(resourceTypes) || "—"}</Badge></TableCell>
                        <TableCell><Badge variant="secondary">{formatJsonArray(securityProps) || "—"}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Edit Feature</DialogTitle>
                              </DialogHeader>
                              <FeatureForm initialData={feature} onSubmit={handleSubmit} assets={initialAssets} />
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(feature.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FeatureForm({ onSubmit, initialData, assets }: { onSubmit: (data: FeatureFormData) => void; initialData?: Feature; assets: { id: string; assetIdentifier: string }[] }) {
  const initialAssetId = initialData?.assetId ?? undefined;
  const [formData, setFormData] = useState<FeatureFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    assetId: initialAssetId,
    rolesJson: initialData?.rolesJson ? JSON.parse(initialData.rolesJson) : [],
    resourceTypesJson: initialData?.resourceTypesJson ? JSON.parse(initialData.resourceTypesJson) : [],
    expectedSecurityPropertiesJson: initialData?.expectedSecurityPropertiesJson ? JSON.parse(initialData.expectedSecurityPropertiesJson) : [],
    notes: initialData?.notes || "",
  });

  const handleChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: string, value: string) => {
    const arr = value.split(",").map(s => s.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, [field]: arr }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const formatJsonArray = (arr: string[]): string => arr.join(", ");

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Feature Name *</Label>
        <Input id="name" placeholder="e.g., User Authentication" value={formData.name} onChange={e => handleChange("name", e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="assetId">Asset</Label>
        <Select value={formData.assetId as string | undefined} onValueChange={value => handleChange("assetId", value)}>
          <SelectTrigger><SelectValue placeholder="Select asset (optional)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {assets.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.assetIdentifier}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" placeholder="Describe the feature and its purpose" rows={3} value={formData.description} onChange={e => handleChange("description", e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rolesJson">Roles (comma-separated)</Label>
        <Input id="rolesJson" placeholder="admin, user, guest" value={formatJsonArray(formData.rolesJson)} onChange={e => handleArrayChange("rolesJson", e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="resourceTypesJson">Resource Types (comma-separated)</Label>
        <Input id="resourceTypesJson" placeholder="user, organization, project" value={formatJsonArray(formData.resourceTypesJson)} onChange={e => handleArrayChange("resourceTypesJson", e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expectedSecurityPropertiesJson">Expected Security Properties (comma-separated)</Label>
        <Input id="expectedSecurityPropertiesJson" placeholder="authorization, authentication, rate-limiting, encryption" value={formatJsonArray(formData.expectedSecurityPropertiesJson)} onChange={e => handleArrayChange("expectedSecurityPropertiesJson", e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Additional context..." rows={3} value={formData.notes} onChange={e => handleChange("notes", e.target.value)} />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={() => window.history.back()}>Cancel</Button>
        <Button type="submit">Save Feature</Button>
      </div>
    </form>
  );
}