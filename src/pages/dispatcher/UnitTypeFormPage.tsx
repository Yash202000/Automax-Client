import React, { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  ArrowLeft,
  Layers,
  Gauge,
  Palette,
  ImagePlus,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import {
  dispatcherApi,
  UNIT_STATUS_KEYS,
  type UnitType,
  DEFAULT_UNIT_STATUS_COLORS,
  type UnitStatusKey,
  type UnitTypeInput,
} from "../../api/dispatcher";
import {
  Button,
  Input,
  Select,
  TreeSelect,
  type TreeNode,
} from "../../components/ui";
import { DatePicker } from "../../components/ui/Datepicker";
import { departmentApi } from "../../api/admin";
import type { TreeSelectNode } from "../../utils/treeUtils";
import { Section } from "./UnitFormPage";
import { STATUS_LABELS } from "./unitStatus";
import { parseApiError } from "./apiError";

const MAX_SVG_BYTES = 200 * 1024;

type Form = {
  name: string;
  code: string;
  alt_name: string;
  department_id: string;
  acceptance_timeout_seconds: string;
  icon?: string;
  min_speed: string;
  max_speed: string;
  min_weight: string;
  max_weight: string;
  active_till_date?: Date;
  is_active: boolean;
  colors: Record<UnitStatusKey, string>;
};

const emptyForm = (): Form => ({
  name: "",
  code: "",
  alt_name: "",
  department_id: "",
  acceptance_timeout_seconds: "0",
  icon: undefined,
  min_speed: "0",
  max_speed: "0",
  min_weight: "0",
  max_weight: "0",
  active_till_date: undefined,
  is_active: true,
  colors: { ...DEFAULT_UNIT_STATUS_COLORS },
});

const toTreeNodes = (data: unknown[] = []): TreeNode[] =>
  data.map((item) => {
    const n = item as {
      id: string;
      name: string;
      name_ar?: string;
      types?: string[];
      children?: unknown[];
    };
    return {
      id: n.id,
      name: n.name,
      name_ar: n.name_ar ?? undefined,
      types: n.types,
      children: n.children ? toTreeNodes(n.children) : undefined,
    };
  });

const toForm = (existing: UnitType): Form => ({
  name: existing.name,
  code: existing.code,
  alt_name: existing.alt_name ?? "",
  department_id: existing.department_id,
  acceptance_timeout_seconds: String(existing.acceptance_timeout_seconds ?? 0),
  icon: existing.icon ?? undefined,
  min_speed: String(existing.min_speed ?? 0),
  max_speed: String(existing.max_speed ?? 0),
  min_weight: String(existing.min_weight ?? 0),
  max_weight: String(existing.max_weight ?? 0),
  active_till_date: existing.active_till_date
    ? new Date(`${existing.active_till_date}T00:00:00`)
    : undefined,
  is_active: existing.is_active ?? true,
  colors: { ...DEFAULT_UNIT_STATUS_COLORS, ...existing.colors },
});

const UnitTypeFormPageInner: React.FC<{ id?: string; existing?: UnitType }> = ({
  id,
  existing,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const [form, setForm] = useState<Form>(() =>
    existing ? toForm(existing) : emptyForm(),
  );
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>(
    {},
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: departmentsData } = useQuery({
    queryKey: ["admin", "departments", "tree"],
    queryFn: () => departmentApi.getTree(),
  });
  const departmentsTree = useMemo(
    () => toTreeNodes(departmentsData?.data) as unknown as TreeSelectNode[],
    [departmentsData?.data],
  );

  const text =
    (k: keyof Form, field?: string) => (e: { target: { value: string } }) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      if (field) setServerErrors((s) => ({ ...s, [field]: [] }));
    };

  const num = (v: string) => Number(v);
  const speedBad = num(form.min_speed) > num(form.max_speed);
  const weightBad = num(form.min_weight) > num(form.max_weight);
  const missing = {
    name: !form.name.trim(),
    code: !form.code.trim(),
    department_id: !form.department_id,
  };
  const numbersOk = [
    form.acceptance_timeout_seconds,
    form.min_speed,
    form.max_speed,
    form.min_weight,
    form.max_weight,
  ].every((v) => v !== "" && num(v) >= 0);
  const isValid =
    !Object.values(missing).some(Boolean) &&
    !speedBad &&
    !weightBad &&
    numbersOk;

  const required = t("common.required", "Required");
  const rangeErr = t(
    "unitManagement.invalidRange",
    "Minimum must not exceed maximum",
  );
  const fieldErr = (field: keyof typeof missing) =>
    submitted && missing[field]
      ? required
      : serverErrors[field]?.[0] || undefined;

  const goBack = () => navigate("/unit-management/unit-types");

  const onFile = (file?: File) => {
    if (!file) return;
    if (file.type !== "image/svg+xml") {
      toast.error(t("unitManagement.svgOnly", "Only SVG images are allowed"));
      return;
    }
    if (file.size > MAX_SVG_BYTES) {
      toast.error(
        t("unitManagement.svgTooLarge", "Image must be 200 KB or smaller"),
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setForm((f) => ({ ...f, icon: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const buildPayload = (): UnitTypeInput => ({
    name: form.name.trim(),
    code: form.code.trim(),
    alt_name: form.alt_name.trim() || null,
    department_id: form.department_id,
    acceptance_timeout_seconds: num(form.acceptance_timeout_seconds),
    min_speed: num(form.min_speed),
    max_speed: num(form.max_speed),
    min_weight: num(form.min_weight),
    max_weight: num(form.max_weight),
    active_till_date:
      form.is_active && form.active_till_date
        ? format(form.active_till_date, "yyyy-MM-dd")
        : null,
    is_active: form.is_active,
    icon: form.icon ?? null,
    colors: form.colors,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit
        ? dispatcherApi.updateUnitType(id!, buildPayload())
        : dispatcherApi.createUnitType(buildPayload()),
    onSuccess: () => {
      toast.success(t("common.success", "Saved successfully"));
      queryClient.invalidateQueries({ queryKey: ["dispatcher", "unit-types"] });
      goBack();
    },
    onError: (e) => {
      const { status, message, fields } = parseApiError(e);
      setServerErrors(fields);
      if (status === 409) {
        setServerErrors({
          code: [
            message ||
              t(
                "unitManagement.codeExists",
                "A unit type with this code already exists in the department",
              ),
          ],
        });
      } else {
        toast.error(
          message ||
            t("unitManagement.saveFailed", "Could not save the unit type"),
        );
      }
    },
  });

  const onSave = () => {
    setSubmitted(true);
    if (isValid) saveMutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={goBack}
          title={t("unitManagement.backToUnitTypes", "Back to unit types")}
          className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 rtl:-scale-x-100" />
        </button>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
          {isEdit
            ? t("unitManagement.editUnitType", "Edit Unit Type")
            : t("unitManagement.addUnitType", "Add Unit Type")}
        </h1>
      </div>

      <Section
        icon={Layers}
        title={t(
          "unitManagement.sectionUnitTypeGeneral",
          "General Information",
        )}
      >
        <Input
          label={t("unitManagement.unitTypeName", "Unit Type Name")}
          required
          maxLength={100}
          value={form.name}
          onChange={text("name", "name")}
          error={fieldErr("name")}
        />
        <Input
          label={t("unitManagement.unitTypeCode", "Unit Type Code")}
          required
          maxLength={20}
          value={form.code}
          onChange={text("code", "code")}
          error={fieldErr("code")}
        />
        <Input
          label={t("unitManagement.altUnitTypeName", "Alt Unit Type Name")}
          maxLength={100}
          dir="auto"
          value={form.alt_name}
          onChange={text("alt_name", "alt_name")}
          error={serverErrors.alt_name?.[0]}
        />
        <TreeSelect
          label={t("unitManagement.department", "Department")}
          required
          data={departmentsTree}
          value={form.department_id}
          onChange={(v) => {
            setForm((f) => ({ ...f, department_id: v }));
            setServerErrors((s) => ({ ...s, department_id: [] }));
          }}
          placeholder={t(
            "unitManagement.selectDepartment",
            "Select department",
          )}
          error={fieldErr("department_id")}
        />
        <Input
          label={t(
            "unitManagement.acceptanceTimeout",
            "Acceptance Timeout (seconds)",
          )}
          type="number"
          min={0}
          step={1}
          value={form.acceptance_timeout_seconds}
          onChange={text(
            "acceptance_timeout_seconds",
            "acceptance_timeout_seconds",
          )}
          error={serverErrors.acceptance_timeout_seconds?.[0]}
        />
        <Select
          label={t("unitManagement.status", "Status")}
          value={String(form.is_active)}
          onChange={(e) =>
            setForm((f) => ({ ...f, is_active: e.target.value === "true" }))
          }
          options={[
            { value: "true", label: t("unitManagement.active", "Active") },
            { value: "false", label: t("unitManagement.inactive", "Inactive") },
          ]}
        />
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
            {t("unitManagement.activeTillDate", "Active Till Date")}
          </label>
          <DatePicker
            value={form.active_till_date}
            onChange={(d) => setForm((f) => ({ ...f, active_till_date: d }))}
            disabled={!form.is_active}
            placeholder={t("unitManagement.activeTillDate", "Active Till Date")}
          />
        </div>

        {/* Icon upload */}
        <div className="md:col-span-2 xl:col-span-3 flex items-center gap-5">
          <div className="w-24 h-24 shrink-0 rounded-xl border-2 border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] flex items-center justify-center overflow-hidden">
            {form.icon ? (
              <img
                src={form.icon}
                alt=""
                className="w-16 h-16 object-contain"
              />
            ) : (
              <Truck className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ImagePlus className="w-4 h-4" />}
                onClick={() => fileRef.current?.click()}
              >
                {t("unitManagement.uploadImage", "Upload Image")}
              </Button>
              {form.icon && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  onClick={() => setForm((f) => ({ ...f, icon: undefined }))}
                >
                  {t("unitManagement.removeImage", "Remove image")}
                </Button>
              )}
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {t("unitManagement.svgFormat", "SVG format, max 200 KB")}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".svg,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </Section>

      <Section
        icon={Gauge}
        title={t("unitManagement.sectionLimits", "Speed & Weight Limits")}
      >
        <Input
          label={`${t("unitManagement.minSpeed", "Minimum Speed")} (km/h)`}
          type="number"
          min={0}
          value={form.min_speed}
          onChange={text("min_speed", "min_speed")}
          error={submitted && speedBad ? rangeErr : serverErrors.min_speed?.[0]}
        />
        <Input
          label={`${t("unitManagement.maxSpeedLabel", "Maximum Speed")} (km/h)`}
          type="number"
          min={0}
          value={form.max_speed}
          onChange={text("max_speed", "max_speed")}
          error={serverErrors.max_speed?.[0]}
        />
        <div className="hidden xl:block" />
        <Input
          label={`${t("unitManagement.minWeight", "Min Weight")} (kg)`}
          type="number"
          min={0}
          value={form.min_weight}
          onChange={text("min_weight", "min_weight")}
          error={
            submitted && weightBad ? rangeErr : serverErrors.min_weight?.[0]
          }
        />
        <Input
          label={`${t("unitManagement.maxWeight", "Max Weight")} (kg)`}
          type="number"
          min={0}
          value={form.max_weight}
          onChange={text("max_weight", "max_weight")}
          error={serverErrors.max_weight?.[0]}
        />
      </Section>

      <Section
        icon={Palette}
        title={t(
          "unitManagement.sectionColors",
          "Pick and Choose Color for the Attributes",
        )}
        subtitle={t(
          "unitManagement.sectionColorsHint",
          "Marker colour shown on the map for each unit status",
        )}
      >
        <div className="md:col-span-2 xl:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          {UNIT_STATUS_KEYS.map((k) => (
            <label
              key={k}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] cursor-pointer hover:bg-[hsl(var(--muted))] transition-colors"
            >
              <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                {t(...STATUS_LABELS[k])}
              </span>
              <input
                type="color"
                value={form.colors[k]}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    colors: { ...f.colors, [k]: e.target.value },
                  }))
                }
                className="w-10 h-8 rounded-md border border-[hsl(var(--border))] bg-transparent cursor-pointer p-0"
              />
            </label>
          ))}
        </div>
      </Section>

      <div className="flex justify-end gap-3 pb-6">
        <Button variant="outline" onClick={goBack}>
          {t("common.cancel", "Cancel")}
        </Button>
        <Button onClick={onSave} isLoading={saveMutation.isPending}>
          {t("common.save", "Save")}
        </Button>
      </div>
    </div>
  );
};

export const UnitTypeFormPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: existing, isLoading } = useQuery({
    queryKey: ["dispatcher", "unit-types", "detail", id],
    queryFn: () => dispatcherApi.getUnitType(id!),
    enabled: !!id,
  });

  if (id && isLoading) {
    return (
      <div className="p-12 text-center text-[hsl(var(--muted-foreground))]">
        {t("common.loading", "Loading...")}
      </div>
    );
  }

  return (
    <UnitTypeFormPageInner key={id ?? "new"} id={id} existing={existing} />
  );
};
