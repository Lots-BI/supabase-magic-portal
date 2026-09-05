const STORAGE_KEY = "approval-library-view";

export type LibraryViewMode = "grid" | "list";

export function getLibraryViewPreference(): LibraryViewMode {
  if (typeof window === "undefined") return "grid";
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "list" ? "list" : "grid";
}

export function setLibraryViewPreference(mode: LibraryViewMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, mode);
}
