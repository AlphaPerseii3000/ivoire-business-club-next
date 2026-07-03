"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

function buildSearchParams(params: Record<string, string | null | undefined>): URLSearchParams {
  const next = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val) next.set(key, val);
  });
  return next;
}

function resolveParam(paramName: AdminMemberFilterSelectProps["paramName"], newValue: string, current: string | undefined): string | undefined {
  if (paramName === "tier") return newValue === "" ? undefined : newValue || current;
  if (paramName === "subscription") return newValue === "" ? undefined : newValue || current;
  if (paramName === "status") return newValue === "" ? undefined : newValue || current;
  if (paramName === "verification") return newValue === "" ? undefined : newValue || current;
  if (paramName === "sort") return newValue === "" ? undefined : newValue || current;
  return undefined;
}

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
          tier: resolveParam("tier", newValue, tier),
          subscription: resolveParam("subscription", newValue, subscription),
          status: resolveParam("status", newValue, status),
          verification: resolveParam("verification", newValue, verification),
          sort: resolveParam("sort", newValue, sort),
        });
        nextParams.delete("page");
        router.replace(`/admin/members${nextParams.toString() ? `?${nextParams.toString()}` : ""}`);
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
