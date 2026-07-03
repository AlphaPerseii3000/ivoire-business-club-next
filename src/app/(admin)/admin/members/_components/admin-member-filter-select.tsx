"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function buildSearchParams(params: Record<string, string | undefined>): string {
  const next = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val) next.set(key, val);
  });
  return next.toString();
}

type FilterOption = { value: string; label: string };

type AdminMemberFilterSelectProps = {
  value: string | undefined;
  placeholder: string;
  options: FilterOption[];
  ariaLabel: string;
  q: string | undefined;
  tier: string | undefined;
  subscription: string | undefined;
  status: string | undefined;
  verification: string | undefined;
  sort: string | undefined;
  paramName: "tier" | "subscription" | "status" | "verification" | "sort";
};

export function AdminMemberFilterSelect({
  value,
  placeholder,
  options,
  ariaLabel,
  q,
  tier,
  subscription,
  status,
  verification,
  sort,
  paramName,
}: AdminMemberFilterSelectProps) {
  const router = useRouter();

  return (
    <Select
      value={value ?? ""}
      onValueChange={(newValue) => {
        const nextParams = buildSearchParams({
          q,
          tier: paramName === "tier" ? (newValue === "" ? undefined : newValue) : tier,
          subscription: paramName === "subscription" ? (newValue === "" ? undefined : newValue) : subscription,
          status: paramName === "status" ? (newValue === "" ? undefined : newValue) : status,
          verification: paramName === "verification" ? (newValue === "" ? undefined : newValue) : verification,
          sort: paramName === "sort" ? (newValue === "" ? undefined : newValue) : sort,
        });
        router.replace(`/admin/members${nextParams ? `?${nextParams}` : ""}`);
      }}
      aria-label={ariaLabel}
    >
      <SelectTrigger className="min-h-11 w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value || "all"} value={option.value || ""}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
