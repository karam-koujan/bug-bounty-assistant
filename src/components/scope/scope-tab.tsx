"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Shield, X, Wrench, DollarSign, Hash, Loader2 } from "lucide-react";
import { assetCreateSchema, scopeStatusSchema } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { z } from "zod";

interface Asset {
  id: string;
  programId: string;
  assetIdentifier: string;
  assetType: string;
  scopeStatus: "in_scope" | "out_of_scope" | "unknown";
  restrictionsJson: string;
  evidenceId: string | null;
  notes: string | null;
}

interface ScopeTabProps {
  programId: string;
  initialAssets?: Asset[];
}

const statusOptions = [
  { value: "in_scope", label: "In Scope", icon: Shield },
  { value: "out_of_scope", label: "Out of Scope", icon: X },
  { value: "unknown", label: "Unknown", icon: Hash },
];

interface AssetFormData {
  assetIdentifier: string;
  assetType: string;
  scopeStatus: "in_scope" | "out_of_scope" | "unknown";
  rateLimit: string;
  authRequired: boolean;
  allowedMethods: string;
  prohibitedMethods: string;
  rewardRange: string;
  notes: string;
}

export function ScopeTab({ programId, initialAssets = [] }: ScopeTabProps) {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: AssetFormData) => {
    try {
      const restrictions = {
        rateLimit: data.rateLimit,
        authRequired: data.authRequired,
        allowedMethods: data.allowedMethods?.split(",").map(s => s.trim()).filter(Boolean) || [],
        prohibitedMethods: data.prohibitedMethods?.split(",").map(s => s.trim()).filter(Boolean) || [],
        rewardRange: data.rewardRange,
      };

      const res = await fetch(`/api/programs/${programId}/scope`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetIdentifier: data.assetIdentifier,
          assetType: data.assetType,
          scopeStatus: data.scopeStatus,
          restrictionsJson: restrictions,
          notes: data.notes,
        }),
      });

      if (!res.ok) throw new Error("Failed to save asset");

      router.refresh();
    } catch (error) {
      console.error("Failed to save asset:", error);
      alert("Failed to save asset. Please try again.");
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!confirm("Delete this asset?")) return;
    try {
      const res = await fetch(`/api/programs/${programId}/scope/${assetId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete asset");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete asset:", error);
      alert("Failed to delete asset.");
    }
  };

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find(o => o.value === status);
    const Icon = option?.icon || Hash;
    const colors = {
      in_scope: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      out_of_scope: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      unknown: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    };
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", colors[status as keyof typeof colors] || colors.unknown)}>
        <Icon className="h-3 w-3" />
        {option?.label || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Asset */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Scope & Rules</h2>
          <p className="text-muted-foreground">Define in-scope assets, exclusions, and testing rules</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add In-Scope Asset</DialogTitle>
            </DialogHeader>
            <AssetForm onSubmit={handleSubmit} />
          </DialogContent>
        </Dialog>
      </div>

      {/* In-Scope Assets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>In-Scope Assets</CardTitle>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No assets defined. Click "Add Asset" to start.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Identifier</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rate Limit</TableHead>
                    <TableHead>Auth Required</TableHead>
                    <TableHead>Reward Range</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset: Asset) => {
                    const restrictions = asset.restrictionsJson ?
                      (() => { try { return JSON.parse(asset.restrictionsJson); } catch { return {}; } })()
                      : {};
                    return (
                      <TableRow key={asset.id}>
                        <TableCell className="font-mono">{asset.assetIdentifier}</TableCell>
                        <TableCell>{asset.assetType}</TableCell>
                        <TableCell>{getStatusBadge(asset.scopeStatus)}</TableCell>
                        <TableCell className="font-mono text-sm">{restrictions.rateLimit || "\u2014"}</TableCell>
                        <TableCell>{restrictions.authRequired ? "Yes" : "No"}</TableCell>
                        <TableCell className="font-mono text-sm">{restrictions.rewardRange || "\u2014"}</TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Edit Asset</DialogTitle>
                              </DialogHeader>
                              <AssetForm initialData={asset} onSubmit={handleSubmit} />
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(asset.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exclusions */}
      <Card>
        <CardHeader>
          <CardTitle>Exclusions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Exclusions are managed as assets with "Out of Scope" status.</p>
        </CardContent>
      </Card>

      {/* Allowed/Prohibited Methods */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Allowed Testing Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Configure per-asset in the restrictions above. Common: IDOR testing, Authorization bypass, XSS/CSRF, API security, Business logic flaws.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><X className="h-5 w-5" /> Prohibited Testing Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Configure per-asset in the restrictions above. Common: Social engineering, Physical security, DoS/DDoS, Third-party services, Employee systems.</p>
          </CardContent>
        </Card>
      </div>

      {/* Rate Limits & Rewards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Hash className="h-5 w-5" /> Rate Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Configure per-asset in the restrictions above. Example: 100 req/min for API, 60 req/min for banking API.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Reward Ranges</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Configure per-asset in the restrictions above. Example: Critical $5,000-$15,000, High $1,000-$5,000, Medium $250-$1,000.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AssetForm({ onSubmit, initialData }: { onSubmit: (data: AssetFormData) => void; initialData?: Asset }) {
  const restrictions = initialData?.restrictionsJson
    ? (() => { try { return JSON.parse(initialData.restrictionsJson); } catch { return {}; } })()
    : {};

  const [formData, setFormData] = useState<AssetFormData>({
    assetIdentifier: initialData?.assetIdentifier || "",
    assetType: initialData?.assetType || "",
    scopeStatus: initialData?.scopeStatus || "unknown",
    rateLimit: restrictions.rateLimit || "",
    authRequired: restrictions.authRequired || false,
    allowedMethods: restrictions.allowedMethods?.join(", ") || "",
    prohibitedMethods: restrictions.prohibitedMethods?.join(", ") || "",
    rewardRange: restrictions.rewardRange || "",
    notes: initialData?.notes || "",
  });

  const handleChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="assetIdentifier">Asset Identifier *</Label>
          <Input id="assetIdentifier" placeholder="e.g., api.example.com" value={formData.assetIdentifier} onChange={e => handleChange("assetIdentifier", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="assetType">Asset Type *</Label>
          <Input id="assetType" placeholder="e.g., API, Web Application, Mobile App" value={formData.assetType} onChange={e => handleChange("assetType", e.target.value)} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="scopeStatus">Scope Status *</Label>
        <Select value={formData.scopeStatus} onValueChange={value => handleChange("scopeStatus", value as AssetFormData["scopeStatus"])}>
          <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="in_scope">In Scope</SelectItem>
            <SelectItem value="out_of_scope">Out of Scope</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rateLimit">Rate Limit</Label>
          <Input id="rateLimit" placeholder="e.g., 100 req/min" value={formData.rateLimit} onChange={e => handleChange("rateLimit", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rewardRange">Reward Range</Label>
          <Input id="rewardRange" placeholder="e.g., Critical: $5,000-$15,000" value={formData.rewardRange} onChange={e => handleChange("rewardRange", e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="allowedMethods">Allowed Methods (comma-separated)</Label>
        <Input id="allowedMethods" placeholder="IDOR, Authorization bypass, XSS, CSRF, API security" value={formData.allowedMethods} onChange={e => handleChange("allowedMethods", e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="prohibitedMethods">Prohibited Methods (comma-separated)</Label>
        <Input id="prohibitedMethods" placeholder="Social engineering, DoS, Physical security" value={formData.prohibitedMethods} onChange={e => handleChange("prohibitedMethods", e.target.value)} />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="authRequired" checked={formData.authRequired} onChange={e => handleChange("authRequired", e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
        <Label htmlFor="authRequired">Authentication Required</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Additional context..." rows={3} value={formData.notes} onChange={e => handleChange("notes", e.target.value)} />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={() => window.history.back()}>Cancel</Button>
        <Button type="submit">Save Asset</Button>
      </div>
    </form>
  );
}