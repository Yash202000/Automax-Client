import EscalationLogView from "@/components/escalation/EscalationLogView";

export function EscalationLogTab({ incidentId }: { incidentId: string }) {
  return <EscalationLogView incidentId={incidentId} compact />;
}
