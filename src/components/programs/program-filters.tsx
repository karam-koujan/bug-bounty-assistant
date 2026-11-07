"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "inbox", label: "Inbox" },
  { value: "evaluating", label: "Evaluating" },
  { value: "ready_to_investigate", label: "Ready to Investigate" },
  { value: "active_research", label: "Active Research" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
];

const sortByOptions = [
  { value: "updatedAt", label: "Updated" },
  { value: "name", label: "Name" },
  { value: "platform", label: "Platform" },
  { value: "researchStatus", label: "Status" },
  { value: "createdAt", label: "Created" },
];

const sortOrderOptions = [
  { value: "desc", label: "Desc" },
  { value: "asc", label: "Asc" },
];

export function ProgramFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg border">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search programs..."
          value={searchParams.get("search") || ""}
          onChange={(e) => updateParam("search", e.target.value)}
          className="pl-10"
        />
      </div>
      <div className="flex gap-2 flex-wrap">
        <Select value={searchParams.get("status") || ""} onValueChange={(value) => updateParam("status", value)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={searchParams.get("sortBy") || "updatedAt"} onValueChange={(value) => updateParam("sortBy", value)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Sort By" /></SelectTrigger>
          <SelectContent>
            {sortByOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={searchParams.get("sortOrder") || "desc"} onValueChange={(value) => updateParam("sortOrder", value)}>
          <SelectTrigger className="w-[80px]"><SelectValue placeholder="Order" /></SelectTrigger>
          <SelectContent>
            {sortOrderOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}