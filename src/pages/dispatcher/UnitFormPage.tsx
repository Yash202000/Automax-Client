import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  ArrowLeft,
  Truck,
  UserRound,
  Radio,
  MapPin,
  MessageSquare,
  MessagesSquare,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  unitTypeApi,
  servicePointApi,
  resourceApi,
  RESOURCE_STATUSES,
  type Resource,
  type ResourceInput,
  type ResourceStatus,
} from "../../api/dispatcher";
import {
  Button,
  Input,
  Select,
  Textarea,
  TreeSelect,
  MultiTreeSelect,
  type TreeNode,
} from "../../components/ui";
import { DatePicker } from "../../components/ui/Datepicker";
import { userApi, locationApi, classificationApi } from "../../api/admin";
import type { TreeSelectNode } from "../../utils/treeUtils";
import type { User } from "../../types";
import { parseApiError } from "./apiError";

type Form = {
  name: string;
  alternate_name: string;
  unique_id: string;
  chassis_number: string;
  plate_number: string;
  resource_type_id: string;
  service_point_id: string;
  radio_id: string;
  call_code: string;
  status: ResourceStatus;
  is_active: boolean;
  active_till_date?: Date;
  description: string;
  location_id: string;
  classification_ids: string[];
  driver_user_id: string;
  partner_user_id: string;
  gprs: string;
  sms: string;
  sms_vip: string;
  sim: string;
};

const emptyForm: Form = {
  name: "",
  alternate_name: "",
  unique_id: "",
  chassis_number: "",
  plate_number: "",
  resource_type_id: "",
  service_point_id: "",
  radio_id: "",
  call_code: "",
  status: "available",
  is_active: true,
  active_till_date: undefined,
  description: "",
  location_id: "",
  classification_ids: [],
  driver_user_id: "",
  partner_user_id: "",
  gprs: "",
  sms: "",
  sms_vip: "",
  sim: "",
};

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

/** id → name for every node of a tree. */
const nameIndex = (nodes: TreeNode[], out = new Map<string, string>()) => {
  nodes.forEach((n) => {
    out.set(n.id, n.name);
    if (n.children) nameIndex(n.children, out);
  });
  return out;
};

const toForm = (existing: Resource): Form => ({
  ...emptyForm,
  name: existing.name,
  alternate_name: existing.alternate_name ?? "",
  unique_id: existing.unique_id ?? "",
  chassis_number: existing.chassis_number ?? "",
  plate_number: existing.plate_number ?? "",
  resource_type_id: existing.resource_type_id,
  service_point_id: existing.service_point_id ?? "",
  radio_id: existing.radio_id ?? "",
  call_code: existing.call_code ?? "",
  status: existing.status ?? "available",
  is_active: existing.is_active ?? true,
  active_till_date: existing.active_till_date
    ? new Date(`${existing.active_till_date}T00:00:00`)
    : undefined,
  description: existing.description ?? "",
  location_id: existing.location_id ?? "",
  classification_ids: existing.classification_ids ?? [],
  driver_user_id: existing.driver_user_id ?? "",
  partner_user_id: existing.partner_user_id ?? "",
  gprs: existing.gprs ?? "",
  sms: existing.sms ?? "",
  sms_vip: existing.sms_vip ?? "",
  sim: existing.sim ?? "",
});

export const Section: React.FC<{
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  grouped?: boolean;
  children: React.ReactNode;
}> = ({ icon: Icon, title, subtitle, grouped, children }) => (
  <section className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-sm">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] rounded-t-xl">
      <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
        <Icon className="w-4 h-4 text-[hsl(var(--primary))]" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {grouped ? (
      <div className="divide-y divide-[hsl(var(--border))]">{children}</div>
    ) : (
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {children}
      </div>
    )}
  </section>
);

const SubGroup: React.FC<{
  icon: LucideIcon;
  title: string;
  accent: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, accent, children }) => (
  <div className="p-6 flex flex-col md:flex-row gap-4 md:gap-8">
    <div className="md:w-44 shrink-0 flex md:flex-col items-center md:items-start gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${accent}1f`, color: accent }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
        {title}
      </h3>
    </div>
    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {children}
    </div>
  </div>
);

const blankToNull = (v: string) => (v.trim() ? v.trim() : null);

const UnitFormInner: React.FC<{ id?: string; existing?: Resource }> = ({
  id,
  existing,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const [form, setForm] = useState<Form>(() =>
    existing ? toForm(existing) : emptyForm,
  );
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>(
    {},
  );

  const { data: unitTypes = [] } = useQuery({
    queryKey: ["dispatcher", "unit-types", "all"],
    queryFn: unitTypeApi.all,
  });
  const { data: stations = [] } = useQuery({
    queryKey: ["dispatcher", "fire-stations", "all"],
    queryFn: servicePointApi.all,
  });
  const { data: usersData } = useQuery({
    queryKey: ["admin", "users", "dispatcher-drivers"],
    queryFn: () => userApi.list(1, 100),
  });
  const { data: locationsData } = useQuery({
    queryKey: ["admin", "locations", "tree"],
    queryFn: () => locationApi.getTree(),
  });
  const { data: classificationsData } = useQuery({
    queryKey: ["admin", "classifications", "tree"],
    queryFn: () => classificationApi.getTree(),
  });

  const users: User[] = usersData?.data ?? [];
  const userOptions = users.map((u) => ({
    value: u.id,
    label: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.username,
  }));
  const locationsTree = useMemo(
    () => toTreeNodes(locationsData?.data),
    [locationsData?.data],
  );
  const classificationsTree = useMemo(
    () => toTreeNodes(classificationsData?.data),
    [classificationsData?.data],
  );

  const set =
    <K extends keyof Form>(k: K) =>
    (v: Form[K]) => {
      setForm((f) => ({ ...f, [k]: v }));
      setServerErrors((s) => ({ ...s, [k]: [] }));
    };
  const text = (k: keyof Form) => (e: { target: { value: string } }) =>
    set(k)(e.target.value as never);

  const missing = {
    name: !form.name.trim(),
    plate_number: !form.plate_number.trim(),
    resource_type_id: !form.resource_type_id,
    location_id: !form.location_id,
    classification_ids: form.classification_ids.length === 0,
  };
  const partnerNeedsDriver = !!form.partner_user_id && !form.driver_user_id;
  const isValid = !Object.values(missing).some(Boolean) && !partnerNeedsDriver;
  const required = t("common.required", "Required");
  const err = (k: keyof Form) =>
    submitted && k in missing && missing[k as keyof typeof missing]
      ? required
      : serverErrors[k]?.[0] || undefined;

  const goBack = () => navigate("/unit-management/units");

  const buildPayload = (): ResourceInput => {
    const locNames = nameIndex(locationsTree);
    const clsNames = nameIndex(classificationsTree);
    return {
      name: form.name.trim(),
      thing_id: existing?.thing_id ?? null,
      resource_type_id: form.resource_type_id,
      service_point_id: form.service_point_id || null,
      unique_id: blankToNull(form.unique_id),
      chassis_number: blankToNull(form.chassis_number),
      plate_number: blankToNull(form.plate_number),
      alternate_name: blankToNull(form.alternate_name),
      radio_id: blankToNull(form.radio_id),
      call_code: blankToNull(form.call_code),
      location_id: form.location_id || null,
      location_name: locNames.get(form.location_id) ?? null,
      classification_ids: form.classification_ids,
      classification: form.classification_ids
        .map((cid) => clsNames.get(cid))
        .filter((n): n is string => !!n),
      gprs: blankToNull(form.gprs),
      sms: blankToNull(form.sms),
      sms_vip: blankToNull(form.sms_vip),
      sim: blankToNull(form.sim),
      driver_user_id: form.driver_user_id || null,
      partner_user_id: form.partner_user_id || null,
      active_till_date:
        form.is_active && form.active_till_date
          ? format(form.active_till_date, "yyyy-MM-dd")
          : null,
      status: form.status,
      description: blankToNull(form.description),
      is_active: form.is_active,
    };
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit
        ? resourceApi.update(id!, buildPayload())
        : resourceApi.create(buildPayload()),
    onSuccess: () => {
      toast.success(t("common.success", "Saved successfully"));
      queryClient.invalidateQueries({ queryKey: ["dispatcher"] });
      goBack();
    },
    onError: (e) => {
      const { status, message, fields } = parseApiError(e);
      if (status === 409) {
        setServerErrors({
          unique_id: [
            message ||
              t(
                "unitManagement.unitCodeExists",
                "This Unique ID already exists",
              ),
          ],
        });
      } else {
        setServerErrors(fields);
        toast.error(
          message ||
            t("unitManagement.saveFailedUnit", "Could not save the unit"),
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
          title={t("unitManagement.backToUnits", "Back to units")}
          className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 rtl:-scale-x-100" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
            {isEdit
              ? t("unitManagement.editUnit", "Edit Unit")
              : t("unitManagement.addUnit", "Add Unit")}
          </h1>
          {existing?.unique_id && (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {existing.unique_id}
            </p>
          )}
        </div>
      </div>

      <Section
        icon={Truck}
        title={t("unitManagement.sectionGeneral", "General Information")}
      >
        <Input
          label={t("unitManagement.unitName", "Unit Name")}
          required
          value={form.name}
          onChange={text("name")}
          error={err("name")}
        />
        <Input
          label={t("unitManagement.alternateName", "Alternate Name")}
          dir="auto"
          value={form.alternate_name}
          onChange={text("alternate_name")}
          error={err("alternate_name")}
        />
        <Input
          label={t("unitManagement.uniqueId", "Unique ID")}
          value={form.unique_id}
          onChange={text("unique_id")}
          error={err("unique_id")}
        />
        <Input
          label={t("unitManagement.chassisNumber", "Chassis Number")}
          value={form.chassis_number}
          onChange={text("chassis_number")}
          error={err("chassis_number")}
        />
        <Input
          label={t("unitManagement.plateNumber", "Plate Number")}
          required
          value={form.plate_number}
          onChange={text("plate_number")}
          error={err("plate_number")}
        />
        <Select
          label={t("unitManagement.unitType", "Unit Type")}
          required
          value={form.resource_type_id}
          onChange={text("resource_type_id")}
          placeholder={t("unitManagement.selectUnitType", "Select unit type")}
          options={unitTypes
            .filter(
              (x) => x.is_active !== false || x.id === form.resource_type_id,
            )
            .map((x) => ({ value: x.id, label: x.name }))}
          error={err("resource_type_id")}
        />
        <Select
          label={t("unitManagement.fireStation", "Fire Station")}
          value={form.service_point_id}
          onChange={text("service_point_id")}
          placeholder={t(
            "unitManagement.selectFireStation",
            "Select fire station",
          )}
          options={stations.map((x) => ({ value: x.id, label: x.name }))}
        />
        <Input
          label={t("unitManagement.radioId", "Radio ID")}
          value={form.radio_id}
          onChange={text("radio_id")}
          error={err("radio_id")}
        />
        <Input
          label={t("unitManagement.callCode", "Call Code")}
          value={form.call_code}
          onChange={text("call_code")}
          error={err("call_code")}
        />
        <Select
          label={t("unitManagement.unitStatus", "Unit Status")}
          value={form.status}
          onChange={(e) => set("status")(e.target.value as ResourceStatus)}
          options={RESOURCE_STATUSES.map((s) => ({
            value: s,
            label: t(`unitManagement.resStatus.${s}`, s),
          }))}
        />
        <Select
          label={t("unitManagement.status", "Status")}
          value={String(form.is_active)}
          onChange={(e) => set("is_active")(e.target.value === "true")}
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
            onChange={(d) => set("active_till_date")(d)}
            disabled={!form.is_active}
            placeholder={t("unitManagement.activeTillDate", "Active Till Date")}
          />
        </div>
        <div className="md:col-span-2 xl:col-span-3">
          <Textarea
            label={t("unitManagement.description", "Description")}
            value={form.description}
            onChange={text("description")}
          />
        </div>
      </Section>

      <Section
        icon={MapPin}
        title={t(
          "unitManagement.sectionAssignment",
          "Location & Classification",
        )}
      >
        <div className="md:col-span-2 xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <TreeSelect
            label={t("unitManagement.location", "Location")}
            required
            data={locationsTree as unknown as TreeSelectNode[]}
            value={form.location_id}
            onChange={(v) => set("location_id")(v)}
            placeholder={t("unitManagement.selectLocation", "Select location")}
            error={err("location_id")}
          />
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
              {t("unitManagement.classification", "Classification")}
              <span className="text-red-500 ms-1">*</span>
            </label>
            <MultiTreeSelect
              data={classificationsTree}
              selectedIds={form.classification_ids}
              onSelectionChange={(ids) => set("classification_ids")(ids)}
              placeholder={t(
                "unitManagement.selectClassification",
                "Select classification",
              )}
              colorScheme="warning"
            />
            {err("classification_ids") && (
              <p className="mt-2 text-sm text-[hsl(var(--destructive))]">
                {err("classification_ids")}
              </p>
            )}
          </div>
        </div>
      </Section>

      <Section
        icon={UserRound}
        title={t("unitManagement.tabDriver", "Unit Driver Details")}
      >
        <Select
          label={t("unitManagement.driver", "Driver")}
          value={form.driver_user_id}
          onChange={text("driver_user_id")}
          placeholder={t("unitManagement.selectDriver", "Select driver")}
          options={userOptions}
          error={err("driver_user_id")}
        />
        <Select
          label={t("unitManagement.partner", "Partner")}
          value={form.partner_user_id}
          onChange={text("partner_user_id")}
          placeholder={t("unitManagement.selectPartner", "Select partner")}
          options={userOptions.filter((o) => o.value !== form.driver_user_id)}
          error={
            submitted && partnerNeedsDriver
              ? t("unitManagement.driverRequired", "Select a driver first")
              : err("partner_user_id")
          }
        />
      </Section>

      <Section
        icon={Radio}
        title={t("unitManagement.sectionDevice", "Device & Communication")}
        subtitle={t(
          "unitManagement.sectionDeviceHint",
          "GPRS, SMS, SMS VIP and SIM",
        )}
        grouped
      >
        <SubGroup
          icon={Radio}
          accent="#2563eb"
          title={t("unitManagement.tabGprs", "GPRS")}
        >
          <Input
            label={t("unitManagement.tabGprs", "GPRS")}
            value={form.gprs}
            onChange={text("gprs")}
            error={err("gprs")}
          />
        </SubGroup>
        <SubGroup
          icon={MessageSquare}
          accent="#16a34a"
          title={t("unitManagement.tabSms", "SMS")}
        >
          <Input
            label={t("unitManagement.tabSms", "SMS")}
            value={form.sms}
            onChange={text("sms")}
            error={err("sms")}
          />
        </SubGroup>
        <SubGroup
          icon={MessagesSquare}
          accent="#d97706"
          title={t("unitManagement.tabSmsVip", "SMS VIP")}
        >
          <Input
            label={t("unitManagement.tabSmsVip", "SMS VIP")}
            value={form.sms_vip}
            onChange={text("sms_vip")}
            error={err("sms_vip")}
          />
        </SubGroup>
        <SubGroup
          icon={CreditCard}
          accent="#7c3aed"
          title={t("unitManagement.tabSim", "SIM")}
        >
          <Input
            label={t("unitManagement.tabSim", "SIM")}
            value={form.sim}
            onChange={text("sim")}
            error={err("sim")}
          />
        </SubGroup>
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

export const UnitFormPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: existing, isLoading } = useQuery({
    queryKey: ["dispatcher", "units", "detail", id],
    queryFn: () => resourceApi.get(id!),
    enabled: !!id,
  });

  if (id && isLoading) {
    return (
      <div className="p-12 text-center text-[hsl(var(--muted-foreground))]">
        {t("common.loading", "Loading...")}
      </div>
    );
  }

  return <UnitFormInner key={id ?? "new"} id={id} existing={existing} />;
};
