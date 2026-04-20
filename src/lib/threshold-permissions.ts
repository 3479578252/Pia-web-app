import type { UserRole } from "@/types/database";

/**
 * Role-based gate for editing a threshold check. Mirrors the SQL
 * helper `can_edit_threshold()` used by RLS so client pages and
 * server actions can render / enforce the same rule without a
 * round-trip.
 */
export function canEditThreshold(role: UserRole | null): boolean {
  return role === "privacy_officer" || role === "project_manager";
}
