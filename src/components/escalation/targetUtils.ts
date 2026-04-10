import type { EscalationPolicyStepTargetRequest } from "@/types";
import type { TargetEntry } from "./TargetPicker";

/** Convert TargetEntry[] → backend request format */
export function toTargetRequests(
  targets: TargetEntry[],
): EscalationPolicyStepTargetRequest[] {
  return targets.map((t) => ({
    department_id: t.department_id,
    role_id: t.role_id,
    excluded_user_ids: t.excluded_user_ids,
  }));
}

/** Convert backend target (EscalationPolicyStepTarget | EscalationGroupTarget) → TargetEntry */
export function fromBackendTarget(t: {
  department_id?: string;
  department?: { id: string; name: string };
  role_id?: string;
  role?: { id: string; name: string };
  excluded_user_ids?: string[];
}): TargetEntry {
  return {
    department_id: t.department_id,
    department_name: t.department?.name,
    role_id: t.role_id,
    role_name: t.role?.name,
    excluded_user_ids: t.excluded_user_ids || [],
  };
}
