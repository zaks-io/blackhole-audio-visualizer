import { useMemo } from "react";
import type { ParameterGroup } from "./types";

export function useParameterFilter(groups: ParameterGroup[], searchTerm: string): ParameterGroup[] {
  return useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return groups;

    return groups
      .map((group) => ({
        ...group,
        parameters: group.parameters.filter((p) => p.label.toLowerCase().includes(term)),
      }))
      .filter((group) => group.parameters.length > 0);
  }, [groups, searchTerm]);
}
