import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
  dispatcherApi,
  SMS_VIP_COUNT,
  type Unit,
  type UnitGprs,
  type UnitSms,
  type UnitSim,
} from "../../api/dispatcher";
import {
  Button,
  Input,
  Select,
  Textarea,
  TreeSelect,
  type TreeNode,
} from "../../components/ui";
import { DatePicker } from "../../components/ui/Datepicker";
import { userApi, locationApi, classificationApi } from "../../api/admin";
import type { TreeSelectNode } from "../../utils/treeUtils";
import type { User } from "../../types";

type Form = {
  name: string;
  alternate_name: string;
  plate_number: string;
  unit_type: string;
  location_id: string;
  classification_id: string;
  description: string;
  radio_id: string;
  is_active: boolean;
  active_till?: Date;
  shift: string;
  driver_id: string;
  partner_id: string;
  call_code: string;
  gprs: UnitGprs;
  sms: UnitSms;
  sms_vip: string[];
  sim: UnitSim;
};

const emptyForm: Form = {
  name: "",
  alternate_name: "",
  plate_number: "",
  unit_type: "",
  location_id: "",
  classification_id: "",
  description: "",
  radio_id: "",
  is_active: true,
  active_till: undefined,
  shift: "",
  driver_id: "",
  partner_id: "",
  call_code: "",
  gprs: {
    enabled: false,
    dial_up_number: "",
    apn: "",
    username: "",
    password: "",
    ip_type: "",
    host_ip: "",
    host_port: "",
    sync_interval: "",
    dns_ip: "",
  },
  sms: {
    connect_type: "",
    service_center: "",
    base_number: "",
    csd_base_number: "",
    incoming_command_check: false,
  },
  sms_vip: Array(SMS_VIP_COUNT).fill(""),
  sim: { pin_code: "", voice_no: "", data_no: "" },
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

export const CheckField: React.FC<{
  label: string;
  checked: boolean;
  // eslint-disable-next-line no-unused-vars
  onChange: (_checked: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label className="inline-flex items-center gap-2.5 text-sm font-medium text-[hsl(var(--foreground))] cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 rounded accent-[hsl(var(--primary))]"
    />
    {label}
  </label>
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

const toForm = (existing: Unit): Form => ({
  ...emptyForm,
  name: existing.name,
  alternate_name: existing.alternate_name ?? "",
  plate_number: existing.plate_number,
  unit_type: existing.unit_type,
  location_id: existing.location_id ?? "",
  classification_id: existing.classification_id ?? "",
  description: existing.description ?? "",
  radio_id: existing.radio_id,
  is_active: existing.is_active ?? true,
  active_till: existing.active_till
    ? new Date(existing.active_till)
    : undefined,
  shift: existing.shift ?? "",
  driver_id: existing.driver_id ?? "",
  partner_id: existing.partner_id ?? "",
  call_code: existing.call_code ?? "",
  gprs: { ...emptyForm.gprs, ...existing.gprs },
  sms: { ...emptyForm.sms, ...existing.sms },
  sms_vip: Array.from(
    { length: SMS_VIP_COUNT },
    (_, i) => existing.sms_vip?.[i] ?? "",
  ),
  sim: { ...emptyForm.sim, ...existing.sim },
});

const UnitFormPageInner: React.FC<{ id?: string; existing?: Unit }> = ({
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

  const { data: unitTypes = [] } = useQuery({
    queryKey: ["dispatcher", "unit-types", "all"],
    queryFn: dispatcherApi.getAllUnitTypes,
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
    () => toTreeNodes(locationsData?.data) as unknown as TreeSelectNode[],
    [locationsData?.data],
  );
  const classificationsTree = useMemo(
    () => toTreeNodes(classificationsData?.data) as unknown as TreeSelectNode[],
    [classificationsData?.data],
  );

  const set =
    <K extends keyof Form>(k: K) =>
    (v: Form[K]) =>
      setForm((f) => ({ ...f, [k]: v }));
  const text = (k: keyof Form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const nested =
    <G extends "gprs" | "sms" | "sim">(g: G) =>
    (k: keyof Form[G]) =>
    (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [g]: { ...f[g], [k]: e.target.value } }));
  const nestedFlag =
    <G extends "gprs" | "sms">(g: G, k: keyof Form[G]) =>
    (checked: boolean) =>
      setForm((f) => ({ ...f, [g]: { ...f[g], [k]: checked } }));
  const gprsText = nested("gprs");
  const smsText = nested("sms");
  const simText = nested("sim");

  const missing = {
    name: !form.name.trim(),
    plate_number: !form.plate_number.trim(),
    unit_type: !form.unit_type,
    location_id: !form.location_id,
    classification_id: !form.classification_id,
  };
  const isValid = !Object.values(missing).some(Boolean);
  const err = (k: keyof typeof missing) =>
    submitted && missing[k]
      ? t("common.required", "This field is required")
      : undefined;

  const goBack = () => navigate("/unit-management/units");

  const saveMutation = useMutation({
    mutationFn: () =>
      dispatcherApi.saveUnit({
        ...form,
        name: form.name.trim(),
        id,
        unit_id: existing?.unit_id,
        active_till: form.is_active
          ? form.active_till?.toISOString()
          : undefined,
      }),
    onSuccess: () => {
      toast.success(t("common.success", "Saved successfully"));
      queryClient.invalidateQueries({ queryKey: ["dispatcher", "units"] });
      queryClient.invalidateQueries({ queryKey: ["dispatcher", "unit", id] });
      goBack();
    },
  });

  const onSave = () => {
    setSubmitted(true);
    if (isValid) saveMutation.mutate();
  };

  const shiftOptions = [
    { value: "morning", label: t("unitManagement.shiftMorning", "Morning") },
    { value: "evening", label: t("unitManagement.shiftEvening", "Evening") },
    { value: "night", label: t("unitManagement.shiftNight", "Night") },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
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
          {existing?.unit_id && (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {existing.unit_id}
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
          value={form.alternate_name}
          onChange={text("alternate_name")}
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
          value={form.unit_type}
          onChange={text("unit_type")}
          placeholder={t("unitManagement.selectUnitType", "Select unit type")}
          options={unitTypes
            .filter((x) => x.is_active !== false || x.name === form.unit_type)
            .map((x) => ({ value: x.name, label: x.name }))}
          error={err("unit_type")}
        />
        <Input
          label={t("unitManagement.radioId", "Radio ID")}
          value={form.radio_id}
          onChange={text("radio_id")}
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
            value={form.active_till}
            onChange={(d) => set("active_till")(d)}
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
        <div className="md:col-span-1 xl:col-span-1">
          <TreeSelect
            label={t("unitManagement.location", "Location")}
            required
            data={locationsTree}
            value={form.location_id}
            onChange={(v) => set("location_id")(v)}
            placeholder={t("unitManagement.selectLocation", "Select location")}
            error={err("location_id")}
          />
        </div>
        <div className="md:col-span-1 xl:col-span-2">
          <TreeSelect
            label={t("unitManagement.classification", "Classification")}
            required
            data={classificationsTree}
            value={form.classification_id}
            onChange={(v) => set("classification_id")(v)}
            placeholder={t(
              "unitManagement.selectClassification",
              "Select classification",
            )}
            error={err("classification_id")}
          />
        </div>
      </Section>

      <Section
        icon={UserRound}
        title={t("unitManagement.tabDriver", "Unit Driver Details")}
      >
        <Select
          label={t("unitManagement.shift", "Shift")}
          value={form.shift}
          onChange={text("shift")}
          placeholder={t("unitManagement.selectShift", "Select shift")}
          options={shiftOptions}
        />
        <Select
          label={t("unitManagement.driver", "Driver")}
          value={form.driver_id}
          onChange={text("driver_id")}
          placeholder={t("unitManagement.selectDriver", "Select driver")}
          options={userOptions}
        />
        <Select
          label={t("unitManagement.partner", "Partner")}
          value={form.partner_id}
          onChange={text("partner_id")}
          placeholder={t("unitManagement.selectPartner", "Select partner")}
          options={userOptions.filter((o) => o.value !== form.driver_id)}
        />
        <Input
          label={t("unitManagement.callCode", "Call Code")}
          value={form.call_code}
          onChange={text("call_code")}
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
          <div className="md:col-span-2 xl:col-span-3">
            <CheckField
              label={t("unitManagement.enableGprs", "Enable GPRS")}
              checked={form.gprs.enabled}
              onChange={nestedFlag("gprs", "enabled")}
            />
          </div>
          <Input
            label={t("unitManagement.dialUpNumber", "Dial Up Number")}
            value={form.gprs.dial_up_number}
            onChange={gprsText("dial_up_number")}
          />
          <Input
            label={t("unitManagement.apn", "APN")}
            value={form.gprs.apn}
            onChange={gprsText("apn")}
          />
          <Input
            label={t("unitManagement.userName", "User Name")}
            value={form.gprs.username}
            onChange={gprsText("username")}
            autoComplete="off"
          />
          <Input
            label={t("unitManagement.loginPassword", "Login Password")}
            type="password"
            value={form.gprs.password}
            onChange={gprsText("password")}
            autoComplete="new-password"
          />
          <Select
            label={t("unitManagement.ipType", "IP Type")}
            value={form.gprs.ip_type}
            onChange={gprsText("ip_type")}
            placeholder={t("unitManagement.selectIpType", "Select IP type")}
            options={[
              { value: "ipv4", label: "IPv4" },
              { value: "ipv6", label: "IPv6" },
            ]}
          />
          <Input
            label={t("unitManagement.hostIpAddress", "Host IP Address")}
            value={form.gprs.host_ip}
            onChange={gprsText("host_ip")}
          />
          <Input
            label={t("unitManagement.hostPort", "Host Port")}
            type="number"
            min={0}
            max={65535}
            value={form.gprs.host_port}
            onChange={gprsText("host_port")}
          />
          <Input
            label={t("unitManagement.syncInterval", "Sync Interval")}
            type="number"
            min={0}
            value={form.gprs.sync_interval}
            onChange={gprsText("sync_interval")}
          />
          <Input
            label={t("unitManagement.dnsIp", "DNS IP")}
            value={form.gprs.dns_ip}
            onChange={gprsText("dns_ip")}
          />
        </SubGroup>
        <SubGroup
          icon={MessageSquare}
          accent="#16a34a"
          title={t("unitManagement.tabSms", "SMS")}
        >
          <Select
            label={t("unitManagement.connectType", "Connect Type")}
            value={form.sms.connect_type}
            onChange={smsText("connect_type")}
            placeholder={t(
              "unitManagement.selectConnectType",
              "Select connect type",
            )}
            options={[
              { value: "sms", label: "SMS" },
              { value: "gprs", label: "GPRS" },
              { value: "csd", label: "CSD" },
            ]}
          />
          <Input
            label={t("unitManagement.smsServiceCenter", "SMS Service Center")}
            value={form.sms.service_center}
            onChange={smsText("service_center")}
          />
          <Input
            label={t("unitManagement.smsBaseNumber", "SMS Base Number")}
            value={form.sms.base_number}
            onChange={smsText("base_number")}
          />
          <Input
            label={t("unitManagement.csdBaseNumber", "CSD Base Number")}
            value={form.sms.csd_base_number}
            onChange={smsText("csd_base_number")}
          />
          <div className="md:col-span-2 xl:col-span-3">
            <CheckField
              label={t(
                "unitManagement.incomingCommandCheck",
                "Incoming Command Check",
              )}
              checked={form.sms.incoming_command_check}
              onChange={nestedFlag("sms", "incoming_command_check")}
            />
          </div>
        </SubGroup>
        <SubGroup
          icon={MessagesSquare}
          accent="#d97706"
          title={t("unitManagement.tabSmsVip", "SMS VIP")}
        >
          {form.sms_vip.map((v, i) => (
            <Input
              key={i}
              label={`${t("unitManagement.tabSmsVip", "SMS VIP")} ${i + 1}`}
              value={v}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  sms_vip: f.sms_vip.map((x, j) =>
                    j === i ? e.target.value : x,
                  ),
                }))
              }
            />
          ))}
        </SubGroup>
        <SubGroup
          icon={CreditCard}
          accent="#7c3aed"
          title={t("unitManagement.tabSim", "SIM")}
        >
          <Input
            label={t("unitManagement.pinCode", "PIN Code")}
            value={form.sim.pin_code}
            onChange={simText("pin_code")}
          />
          <Input
            label={t("unitManagement.voiceNo", "Voice No")}
            value={form.sim.voice_no}
            onChange={simText("voice_no")}
          />
          <Input
            label={t("unitManagement.dataNo", "Data No")}
            value={form.sim.data_no}
            onChange={simText("data_no")}
          />
        </SubGroup>
      </Section>

      {/* Footer */}
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
    queryKey: ["dispatcher", "unit", id],
    queryFn: () => dispatcherApi.getUnit(id!),
    enabled: !!id,
  });

  if (id && isLoading) {
    return (
      <div className="p-12 text-center text-[hsl(var(--muted-foreground))]">
        {t("common.loading", "Loading...")}
      </div>
    );
  }

  return <UnitFormPageInner key={id ?? "new"} id={id} existing={existing} />;
};
