"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Shield, Loader2, Lock, Unlock, Bug, CheckCircle, XCircle, MinusCircle } from "lucide-react";
import { endpointCreateSchema, endpointListQuerySchema, testStatusSchema } from "@/lib/validation";
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

interface Endpoint {
  id: string;
  programId: string;
  assetId: string | null;
  featureId: string | null;
  method: string;
  pathTemplate: string;
  purpose: string | null;
  authenticationRequirement: string | null;
  expectedAuthorization: string | null;
  sourceEvidenceId: string | null;
  testStatus: "untested" | "testing" | "tested_vulnerable" | "tested_secure" | "blocked";
  notes: string | null;
}

interface EndpointsTabProps {
  programId: string;
  initialEndpoints?: Endpoint[];
  initialAssets?: { id: string; assetIdentifier: string }[];
  initialFeatures?: { id: string; name: string }[];
}

const endpointFormSchema = endpointCreateSchema.omit({ programId: true }).extend({
  method: z.string().min(1).max(10),
  pathTemplate: z.string().min(1, "Path template is required"),
});

type EndpointFormData = z.infer<typeof endpointFormSchema>;

const testStatusOptions = [
  { value: "untested", label: "Untested", icon: MinusCircle, color: "bg-gray-100 text-gray-800" },
  { value: "testing", label: "Testing", icon: Shield, color: "bg-blue-100 text-blue-800" },
  { value: "tested_vulnerable", label: "Tested - Vulnerable", icon: Bug, color: "bg-red-100 text-red-800" },
  { value: "tested_secure", label: "Tested - Secure", icon: CheckCircle, color: "bg-green-100 text-green-800" },
  { value: "blocked", label: "Blocked", icon: XCircle, color: "bg-yellow-100 text-yellow-800" },
];

const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "TRACE"];

export function EndpointsTab({ programId, initialEndpoints = [], initialAssets = [], initialFeatures = [] }: EndpointsTabProps) {
  const router = useRouter();
  const [endpoints, setEndpoints] = useState<Endpoint[]>(initialEndpoints);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ assetId: "", featureId: "", method: "", testStatus: "", search: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  const fetchEndpoints = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...filters,
      });
      const res = await fetch(`/api/programs/${programId}/endpoints?${params}`);
      const data = await res.json();
      setEndpoints(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch endpoints:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: EndpointFormData) => {
    try {
      const res = await fetch(`/api/programs/${programId}/endpoints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to save endpoint");

      router.refresh();
    } catch (error) {
      console.error("Failed to save endpoint:", error);
      alert("Failed to save endpoint. Please try again.");
    }
  };

  const handleDelete = async (endpointId: string) => {
    if (!confirm("Delete this endpoint?")) return;
    try {
      const res = await fetch(`/api/programs/${programId}/endpoints/${endpointId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete endpoint");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete endpoint:", error);
      alert("Failed to delete endpoint.");
    }
  };

  const getStatusBadge = (status: string) => {
    const option = testStatusOptions.find(o => o.value === status);
    const Icon = option?.icon || MinusCircle;
    return (
      <Badge className={cn(option?.color || "bg-gray-100 text-gray-800")}>
        <Icon className="h-3 w-3 mr-1" />
        {option?.label || status}
      </Badge>
    );
  };

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      GET: "bg-green-100 text-green-800",
      POST: "bg-blue-100 text-blue-800",
      PUT: "bg-yellow-100 text-yellow-800",
      PATCH: "bg-orange-100 text-orange-800",
      DELETE: "bg-red-100 text-red-800",
    };
    return <Badge className={colors[method] || "bg-gray-100 text-gray-800"}>{method}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Endpoints</h2>
          <p className="text-muted-foreground">Map API endpoints with authentication and authorization details</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Endpoint
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Endpoint</DialogTitle>
            </DialogHeader>
            <EndpointForm onSubmit={handleSubmit} assets={initialAssets} features={initialFeatures} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <Select value={filters.assetId} onValueChange={value => { setFilters(prev => ({ ...prev, assetId: value })); setCurrentPage(1); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by asset" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Assets</SelectItem>
                {initialAssets.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.assetIdentifier}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.featureId} onValueChange={value => { setFilters(prev => ({ ...prev, featureId: value })); setCurrentPage(1); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by feature" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Features</SelectItem>
                {initialFeatures.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.method} onValueChange={value => { setFilters(prev => ({ ...prev, method: value })); setCurrentPage(1); }}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="Method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Methods</SelectItem>
                {httpMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.testStatus} onValueChange={value => { setFilters(prev => ({ ...prev, testStatus: value })); setCurrentPage(1); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Test Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                {testStatusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Input
                placeholder="Search path..."
                value={filters.search}
                onChange={e => { setFilters(prev => ({ ...prev, search: e.target.value })); setCurrentPage(1); }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Endpoints</CardTitle>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        </CardHeader>
        <CardContent>
          {endpoints.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No endpoints defined. Click "Add Endpoint" to start.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Method</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead>Auth</TableHead>
                    <TableHead>Test Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endpoints.map((endpoint: Endpoint) => {
                    const asset = initialAssets.find(a => a.id === endpoint.assetId);
                    const feature = initialFeatures.find(f => f.id === endpoint.featureId);
                    return (
                      <TableRow key={endpoint.id}>
                        <TableCell>{getMethodBadge(endpoint.method)}</TableCell>
                        <TableCell className="font-mono">{endpoint.pathTemplate}</TableCell>
                        <TableCell>{asset?.assetIdentifier || "—"}</TableCell>
                        <TableCell>{feature?.name || "—"}</TableCell>
                        <TableCell>
                          {endpoint.authenticationRequirement ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <Lock className="h-3 w-3" /> {endpoint.authenticationRequirement}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-gray-400">
                              <Unlock className="h-3 w-3" /> None
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(endpoint.testStatus)}</TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Edit Endpoint</DialogTitle>
                              </DialogHeader>
                              <EndpointForm initialData={endpoint} onSubmit={handleSubmit} assets={initialAssets} features={initialFeatures} />
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(endpoint.id)}>
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

function EndpointForm({ onSubmit, initialData, assets, features }: { onSubmit: (data: EndpointFormData) => void; initialData?: Endpoint; assets: { id: string; assetIdentifier: string }[]; features: { id: string; name: string }[] }) {
  const initialAssetId = initialData?.assetId ?? undefined;
  const initialFeatureId = initialData?.featureId ?? undefined;
  const [formData, setFormData] = useState<EndpointFormData>({
    method: initialData?.method || "GET",
    pathTemplate: initialData?.pathTemplate || "",
    assetId: initialAssetId,
    featureId: initialFeatureId,
    purpose: initialData?.purpose || "",
    authenticationRequirement: initialData?.authenticationRequirement || "",
    expectedAuthorization: initialData?.expectedAuthorization || "",
    sourceEvidenceId: initialData?.sourceEvidenceId || "",
    testStatus: initialData?.testStatus || "untested",
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
          <Label htmlFor="method">HTTP Method *</Label>
          <Select value={formData.method} onValueChange={value => handleChange("method", value)}>
            <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
            <SelectContent>
              {httpMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pathTemplate">Path Template *</Label>
          <Input id="pathTemplate" placeholder="/api/v1/users/:id" value={formData.pathTemplate} onChange={e => handleChange("pathTemplate", e.target.value)} required />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="assetId">Asset</Label>
          <Select value={formData.assetId as string | undefined} onValueChange={value => handleChange("assetId", value)}>
            <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {assets.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.assetIdentifier}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="featureId">Feature</Label>
          <Select value={formData.featureId as string | undefined} onValueChange={value => handleChange("featureId", value)}>
            <SelectTrigger><SelectValue placeholder="Select feature" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {features.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="purpose">Purpose</Label>
        <Input id="purpose" placeholder="e.g., Retrieve user profile" value={formData.purpose} onChange={e => handleChange("purpose", e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="authenticationRequirement">Authentication Requirement</Label>
        <Input id="authenticationRequirement" placeholder="e.g., Bearer token, API key, Session cookie" value={formData.authenticationRequirement} onChange={e => handleChange("authenticationRequirement", e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expectedAuthorization">Expected Authorization</Label>
        <Input id="expectedAuthorization" placeholder="e.g., User can only access own resources, Admin can access all" value={formData.expectedAuthorization} onChange={e => handleChange("expectedAuthorization", e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sourceEvidenceId">Source Evidence ID</Label>
        <Input id="sourceEvidenceId" placeholder="Link to evidence record that discovered this endpoint" value={formData.sourceEvidenceId as string | undefined} onChange={e => handleChange("sourceEvidenceId", e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="testStatus">Test Status</Label>
        <Select value={formData.testStatus} onValueChange={value => handleChange("testStatus", value as any)}>
          <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
          <SelectContent>
            {testStatusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Additional context..." rows={3} value={formData.notes} onChange={e => handleChange("notes", e.target.value)} />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={() => window.history.back()}>Cancel</Button>
        <Button type="submit">Save Endpoint</Button>
      </div>
    </form>
  );
}