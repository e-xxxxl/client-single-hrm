// Shared enums / option lists. Kept in sync with the server's permission and
// model definitions.

export const PLATFORM_ROLE = "Platform Admin";
export const ORG_ADMIN_ROLE = "Org Admin";

/** Roles inside an organization, highest authority first (server: utils/permissions.js). */
export const ROLES = ["Org Admin", "HR Manager", "HR Staff", "Finance", "Branch Manager", "Employee"];

/** Roles allowed to delete HR records (departments, leave types, …). */
export const HR_ADMIN_ROLES = ["Org Admin", "HR Manager"];

/**
 * Roles `actorRole` may grant — mirrors the server's assignableRoles(). The
 * server enforces this; the client only uses it to shape the dropdowns.
 */
export function assignableRoles(actorRole) {
  if (actorRole === ORG_ADMIN_ROLE) return [...ROLES];
  const rank = ROLES.indexOf(actorRole);
  return rank === -1 ? [] : ROLES.slice(rank + 1);
}

export const BRAND_COLORS = ["blue", "green", "amber", "orange", "purple", "teal", "rose"];

export const PAYROLL_STRATEGIES = [
  { value: "fixed-monthly", label: "Fixed monthly" },
  { value: "hybrid", label: "Hybrid (base + per-trip commission)" },
  { value: "allowance-based", label: "Allowance-based (basic + allowances)" },
];

export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "NYSC",
  "Locum",
];

export const EMPLOYMENT_STATUSES = [
  "Active",
  "Probation",
  "Suspended",
  "On Leave",
  "Exited",
];

export const GENDERS = ["Male", "Female"];

export const LEAVE_STATUSES = [
  "Pending",
  "Manager Approved",
  "Approved",
  "Rejected",
  "Cancelled",
  "Clarification Requested",
];

export const ATTENDANCE_STATUSES = ["Present", "Late", "Absent", "On Leave", "Not Clocked In"];

// The 36 states + FCT.
export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa",
  "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger",
  "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe",
  "Zamfara", "FCT - Abuja",
];

export const PAGE_SIZE = 20;
