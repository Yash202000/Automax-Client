import React, { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Building2,
  ImagePlus,
  MapPin,
  Shapes,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { dispatcherApi, type FireStation } from "../../api/dispatcher";
import {
  Button,
  Input,
  Select,
  TreeSelect,
  type TreeNode,
} from "../../components/ui";
import { MultiSelect } from "../../components/ui/MultiSelect";
import {
  LocationPicker,
  type LocationData,
} from "../../components/ui/LocationPicker";
import { DatePicker } from "../../components/ui/Datepicker";
import { locationApi } from "../../api/admin";
import type { TreeSelectNode } from "../../utils/treeUtils";
import { Section } from "./UnitFormPage";

const MAX_ICON_BYTES = 500 * 1024;
const ICON_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

type Form = {
  name: string;
  name_ar: string;
  unit_ids: string[];
  location_id: string;
  radio_id: string;
  is_active: boolean;
  active_till?: Date;
  icon?: string;
  geo?: LocationData;
};

const emptyForm: Form = {
  name: "",
  name_ar: "",
  unit_ids: [],
  location_id: "",
  radio_id: "",
  is_active: true,
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

const toForm = (existing: FireStation): Form => ({
  name: existing.name,
  name_ar: existing.name_ar ?? "",
  unit_ids: existing.unit_ids ?? [],
  location_id: existing.location_id ?? "",
  radio_id: existing.radio_id ?? "",
  is_active: existing.is_active ?? true,
  active_till: existing.active_till
    ? new Date(existing.active_till)
    : undefined,
  icon: existing.icon,
  geo: { latitude: existing.latitude, longitude: existing.longitude },
});

const FireStationFormPageInner: React.FC<{
  id?: string;
  existing?: FireStation;
}> = ({ id, existing }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const [form, setForm] = useState<Form>(() =>
    existing ? toForm(existing) : emptyForm,
  );
  const [submitted, setSubmitted] = useState(false);
  const [coordError, setCoordError] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: units = [] } = useQuery({
    queryKey: ["dispatcher", "units"],
    queryFn: dispatcherApi.getUnits,
  });
  const { data: locationsData } = useQuery({
    queryKey: ["admin", "locations", "tree"],
    queryFn: () => locationApi.getTree(),
  });

  const locationsTree = useMemo(
    () => toTreeNodes(locationsData?.data) as unknown as TreeSelectNode[],
    [locationsData?.data],
  );

  const text = (k: keyof Form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const hasCoords =
    form.geo?.latitude !== undefined &&
    form.geo?.longitude !== undefined &&
    !Number.isNaN(form.geo.latitude) &&
    !Number.isNaN(form.geo.longitude);
  const missing = {
    name: !form.name.trim(),
    unit_ids: form.unit_ids.length === 0,
    radio_id: !form.radio_id.trim(),
    icon: !form.icon,
    geo: !hasCoords || !!coordError,
  };
  const isValid = !Object.values(missing).some(Boolean);
  const required = t("common.required", "Required");

  const goBack = () => navigate("/unit-management/fire-stations");

  const onFile = (file?: File) => {
    if (!file) return;
    if (!ICON_TYPES.includes(file.type)) {
      toast.error(
        t(
          "unitManagement.imageOnly",
          "Only PNG, JPG or SVG images are allowed",
        ),
      );
      return;
    }
    if (file.size > MAX_ICON_BYTES) {
      toast.error(
        t("unitManagement.imageTooLarge", "Image must be 500 KB or smaller"),
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setForm((f) => ({ ...f, icon: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      dispatcherApi.saveFireStation({
        location_name: "",
        address: form.geo?.address ?? "",
        phone: "",
        ...existing,
        id,
        name: form.name.trim(),
        name_ar: form.name_ar.trim() || undefined,
        unit_ids: form.unit_ids,
        location_id: form.location_id || undefined,
        radio_id: form.radio_id.trim(),
        is_active: form.is_active,
        active_till: form.is_active
          ? form.active_till?.toISOString()
          : undefined,
        icon: form.icon,
        latitude: form.geo!.latitude,
        longitude: form.geo!.longitude,
      }),
    onSuccess: () => {
      toast.success(t("common.success", "Saved successfully"));
      queryClient.invalidateQueries({
        queryKey: ["dispatcher", "fire-stations"],
      });
      queryClient.invalidateQueries({
        queryKey: ["dispatcher", "fire-station", id],
      });
      goBack();
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
          title={t(
            "unitManagement.backToFireStations",
            "Back to fire stations",
          )}
          className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 rtl:-scale-x-100" />
        </button>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
          {isEdit
            ? t("unitManagement.editFireStation", "Edit Fire Station")
            : t("unitManagement.addFireStation", "Add Fire Station")}
        </h1>
      </div>

      <Section
        icon={Building2}
        title={t("unitManagement.sectionFsGeneral", "General Information")}
      >
        <Input
          label={t(
            "unitManagement.fireStationNameEn",
            "Fire Station Name English",
          )}
          required
          value={form.name}
          onChange={text("name")}
          error={submitted && missing.name ? required : undefined}
        />
        <Input
          label={t(
            "unitManagement.fireStationNameAr",
            "Fire Station Name Arabic",
          )}
          dir="rtl"
          value={form.name_ar}
          onChange={text("name_ar")}
        />
        <Input
          label={t(
            "unitManagement.radioUniqueId",
            "Fire Station Radio Unique ID",
          )}
          required
          value={form.radio_id}
          onChange={text("radio_id")}
          error={submitted && missing.radio_id ? required : undefined}
        />

        <div className="md:col-span-2 xl:col-span-3">
          <MultiSelect
            label={
              <>
                {t("unitManagement.assignUnits", "Assign Units")}
                <span className="text-[hsl(var(--destructive))] ms-1">*</span>
              </>
            }
            options={units.map((u) => ({
              value: u.id,
              label: `${u.name} (${u.unit_id})`,
            }))}
            value={form.unit_ids}
            onChange={(v) => setForm((f) => ({ ...f, unit_ids: v }))}
            placeholder={t("unitManagement.selectUnits", "Select units")}
            searchable
            showSelectAll
          />
          {submitted && missing.unit_ids && (
            <p className="mt-2 text-sm text-[hsl(var(--destructive))]">
              {required}
            </p>
          )}
        </div>

        <TreeSelect
          label={t("unitManagement.location", "Location")}
          data={locationsTree}
          value={form.location_id}
          onChange={(v) => setForm((f) => ({ ...f, location_id: v }))}
          placeholder={t("unitManagement.selectLocation", "Select location")}
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
            value={form.active_till}
            onChange={(d) => setForm((f) => ({ ...f, active_till: d }))}
            disabled={!form.is_active}
            placeholder={t("unitManagement.activeTillDate", "Active Till Date")}
          />
        </div>
      </Section>

      <Section icon={Shapes} title={t("unitManagement.sectionFsIcon", "Icon")}>
        <div className="md:col-span-2 xl:col-span-3 flex items-center gap-5">
          <div
            className={`w-24 h-24 shrink-0 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-[hsl(var(--muted)/0.3)] ${
              submitted && missing.icon
                ? "border-[hsl(var(--destructive))]"
                : "border-[hsl(var(--border))]"
            }`}
          >
            {form.icon ? (
              <img
                src={form.icon}
                alt=""
                className="w-16 h-16 object-contain"
              />
            ) : (
              <Building2 className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
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
                {t("unitManagement.uploadIcon", "Upload Icon")}
                <span className="text-[hsl(var(--destructive))] ms-1">*</span>
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
            <p
              className={`text-xs ${
                submitted && missing.icon
                  ? "text-[hsl(var(--destructive))]"
                  : "text-[hsl(var(--muted-foreground))]"
              }`}
            >
              {submitted && missing.icon
                ? t("unitManagement.iconRequired", "An icon is required")
                : t("unitManagement.iconHint", "PNG, JPG or SVG, max 500 KB")}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </Section>

      <section className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-sm">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] rounded-t-xl">
          <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
            <MapPin className="w-4 h-4 text-[hsl(var(--primary))]" />
          </div>
          <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            {t("unitManagement.pickLocation", "Pick Location")}
          </h2>
        </div>
        <div className="p-6">
          <LocationPicker
            value={form.geo}
            onChange={(geo) => setForm((f) => ({ ...f, geo }))}
            showCoordinateInputs
            onCoordinateErrorChange={setCoordError}
            required
            error={
              submitted && missing.geo
                ? t(
                    "unitManagement.pickLocationRequired",
                    "Latitude and longitude are required",
                  )
                : undefined
            }
          />
        </div>
      </section>

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

export const FireStationFormPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: existing, isLoading } = useQuery({
    queryKey: ["dispatcher", "fire-station", id],
    queryFn: async () =>
      (await dispatcherApi.getFireStations()).find((x) => x.id === id),
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
    <FireStationFormPageInner key={id ?? "new"} id={id} existing={existing} />
  );
};
