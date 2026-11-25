export const browseFilterOptions = {
  provider_type: ["government", "tertiary_institution", "company", "foundation", "ngo", "multilateral", "unknown"],
  work_arrangement: ["on_site", "remote", "hybrid", "unknown"],
  deadline_type: ["fixed", "rolling", "unknown"],
  closes_within: ["7", "14", "30"],
};

export const browseFilterLabels: Record<keyof typeof browseFilterOptions, string> = {
  provider_type: "Provider type", work_arrangement: "Work arrangement",
  deadline_type: "Deadline type", closes_within: "Closes within",
};

export function browseFilterLabel(key: string, value: string) {
  return key === "closes_within" ? `${value} days` : value.replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());
}

export function parseBrowseFilters(params: Record<string, unknown>) {
  const selected = Object.fromEntries(Object.entries(browseFilterOptions).flatMap(([key, options]) => {
    const value = params[key];
    return typeof value === "string" && options.includes(value) ? [[key, value]] : [];
  }));
  const location = typeof params.location_query === "string" ? params.location_query.trim().slice(0, 100) : "";
  return { ...selected, ...(location ? { location_query: location } : {}) } as Partial<Record<keyof typeof browseFilterOptions | "location_query", string>>;
}
