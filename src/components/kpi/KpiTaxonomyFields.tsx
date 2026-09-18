import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../ui/Input";
import {
  useOperationalObjectives,
  useProcesses,
  useAwardCriteria,
  useAwardSubCriteria,
  usePillars,
} from "../../hooks/useKpi";

interface KpiTaxonomyFieldsProps {
  operationalObjectiveId: string;
  processId: string;
  awardSubCriterionId: string;
  pillarId: string;
  onChange: (patch: {
    operational_objective_id?: string;
    process_id?: string;
    award_sub_criterion_id?: string;
    pillar_id?: string;
  }) => void;
}

// Shared taxonomy block for all three KPI create/edit forms (Strategic,
// Operational, Award) — Objective is the one universal required field, from
// which Goal is derived read-only; Criteria/Sub-Criteria and Pillar are
// optional supplementary tags on every KPI type.
export const KpiTaxonomyFields: React.FC<KpiTaxonomyFieldsProps> = ({
  operationalObjectiveId,
  processId,
  awardSubCriterionId,
  pillarId,
  onChange,
}) => {
  const { t } = useTranslation();
  const { data: objectivesData } = useOperationalObjectives();
  const { data: processesData } = useProcesses();
  const { data: criteriaData } = useAwardCriteria();
  const { data: subCriteriaData } = useAwardSubCriteria();
  const { data: pillarsData } = usePillars();

  const objectives = objectivesData ?? [];
  const processes = processesData ?? [];
  const criteria = criteriaData ?? [];
  const subCriteria = subCriteriaData ?? [];
  const pillars = pillarsData ?? [];

  const selectedProcess = processes.find((p: any) => p.id === processId);
  const selectedObjective = objectives.find(
    (o: any) => o.id === operationalObjectiveId,
  );
  // Process carries its own Goal (kept in sync with its parent Objective's
  // Goal at the DB level) and ListProcesses preloads it directly — use that
  // first since it's reliably populated. The nested
  // `operational_objective.goal` path is NOT preloaded (ListProcesses only
  // preloads OperationalObjective one level deep, not its own Goal), so it
  // never resolves; selectedObjective's own Goal (from useOperationalObjectives,
  // which does preload Goal) is the fallback once an Objective is known but
  // its Process hasn't loaded yet.
  const goalTitle =
    selectedProcess?.goal?.title ?? selectedObjective?.goal?.title ?? "—";

  const [selectedCriterionId, setSelectedCriterionId] = useState("");
  useEffect(() => {
    if (!awardSubCriterionId) {
      setSelectedCriterionId("");
      return;
    }
    const sc = subCriteria.find((s: any) => s.id === awardSubCriterionId);
    if (sc) setSelectedCriterionId(sc.award_criterion_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awardSubCriterionId, subCriteria.length]);

  const visibleSubCriteria = subCriteria.filter(
    (s: any) =>
      !selectedCriterionId || s.award_criterion_id === selectedCriterionId,
  );

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
          {t("kpi.masterData.strategicGoal")}
        </label>
        <div className="w-full px-4 py-3 bg-[hsl(var(--muted))] border-2 border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--muted-foreground))]">
          {goalTitle}
        </div>
      </div>

      <Select
        label={`Objective *`}
        value={processId}
        onChange={(v) => {
          const process = processes.find((p: any) => p.id === v.target.value);
          onChange({
            process_id: v.target.value,
            operational_objective_id:
              process?.operational_objective_id ?? operationalObjectiveId,
          });
        }}
        options={processes.map((p: any) => {
          const parent = objectives.find(
            (o: any) => o.id === p.operational_objective_id,
          );
          return {
            value: p.id,
            label: p.name_en,
            group: parent?.name_en ?? "Other",
          };
        })}
        placeholder={t("common.selectAnOption")}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Criteria"
          value={selectedCriterionId}
          onChange={(v) => {
            setSelectedCriterionId(v.target.value);
            onChange({ award_sub_criterion_id: "" });
          }}
          options={criteria.map((c: any) => ({
            value: c.id,
            label: `${c.criterion_no} - ${c.name_en}`,
          }))}
          placeholder={t("common.selectAnOption")}
        />
        <Select
          label="Sub-Criteria"
          value={awardSubCriterionId}
          onChange={(v) => onChange({ award_sub_criterion_id: v.target.value })}
          options={visibleSubCriteria.map((s: any) => ({
            value: s.id,
            label: `${s.award_criterion?.criterion_no ?? ""}-${s.sub_no} ${s.name_en}`,
          }))}
          placeholder={t("common.selectAnOption")}
        />
      </div>

      <Select
        label={t("kpi.masterData.pillar")}
        value={pillarId}
        onChange={(v) => onChange({ pillar_id: v.target.value })}
        options={pillars.map((p: any) => ({
          value: p.id,
          label: p.name_en,
        }))}
        placeholder={t("common.selectAnOption")}
      />
    </>
  );
};

export default KpiTaxonomyFields;
