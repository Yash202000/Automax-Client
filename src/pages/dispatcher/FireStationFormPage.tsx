import React, { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format, startOfToday } from "date-fns";
import {
  ArrowLeft,
  Building2,
  ImagePlus,
  MapPin,
  Shapes,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  iconApi,
  resourceApi,
  servicePointApi,
  type ServicePoint,
  type ServicePointInput,
} from "../../api/dispatcher";
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
import { departmentApi, locationApi } from "../../api/admin";
import type { TreeSelectNode } from "../../utils/treeUtils";
import { Section } from "./UnitFormPage";
import { DispatchIcon } from "./DispatchIcon";
import { parseApiError } from "./apiError";

const MAX_ICON_BYTES = 2 * 1024 * 1024;
const ICON_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

type Form = {
  name: string;
  alt_name: string;
  radio_id: string;
  department_id: string;
  unit_ids: string[];
  location_id: string;
  is_active: boolean;
  active_till_date?: Date;
  /** Path returned by icon upload. */
  icon?: string;
  geo?: LocationData;
};

const emptyForm: Form = {
  name: "",
  alt_name: "",
  radio_id: "",
  department_id: "",
  unit_ids: [],
  location_id: "",
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

const asTreeSelect = (nodes: TreeNode[]) =>
  nodes as unknown as TreeSelectNode[];

const toForm = (existing: ServicePoint): Form => ({
  name: existing.name,
  alt_name: existing.alt_name ?? "",
  radio_id: existing.radio_id ?? "",
  department_id: existing.department_id,
  unit_ids: existing.resource_ids ?? [],
  location_id: existing.location_id ?? "",
  is_active: existing.is_active ?? true,
  active_till_date: existing.active_till_date
    ? new Date(`${existing.active_till_date}T00:00:00`)
    : undefined,
  icon: existing.icon ?? undefined,
  geo: existing.location
    ? {
        latitude: existing.location.lat,
        longitude: existing.location.lng,
        address: existing.location_name ?? undefined,
      }
    : undefined,
});

const FireStationFormInner: React.FC<{
  id?: string;
  existing?: ServicePoint;
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
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>(
    {},
  );
  const [uploading, setUploading] = useState(false);
  // Local preview of a just-uploaded icon (the stored one is fetched with auth).
  const [localPreview, setLocalPreview] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: units = [] } = useQuery({
    queryKey: ["dispatcher", "units", "all"],
    queryFn: resourceApi.all,
  });
  // Units already assigned to a fire station are not offered; on edit, this
  // station's own units (and any just selected) stay in the list.
  const assignableUnits = units.filter(
    (u) =>
      !u.service_point_id ||
      u.service_point_id === existing?.id ||
      form.unit_ids.includes(u.id),
  );
  const { data: locationsData } = useQuery({
    queryKey: ["admin", "locations", "tree"],
    queryFn: () => locationApi.getTree(),
  });
  const { data: departmentsData } = useQuery({
    queryKey: ["admin", "departments", "tree"],
    queryFn: () => departmentApi.getTree(),
  });

  const locationsTree = useMemo(
    () => asTreeSelect(toTreeNodes(locationsData?.data)),
    [locationsData?.data],
  );
  const departmentsTree = useMemo(
    () => asTreeSelect(toTreeNodes(departmentsData?.data)),
    [departmentsData?.data],
  );

  const text =
    (k: keyof Form, field: string = k) =>
    (e: { target: { value: string } }) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      setServerErrors((s) => ({ ...s, [field]: [] }));
    };

  const hasCoords =
    form.geo?.latitude !== undefined &&
    form.geo?.longitude !== undefined &&
    !Number.isNaN(form.geo.latitude) &&
    !Number.isNaN(form.geo.longitude);
  const missing = {
    name: !form.name.trim(),
    radio_id: !form.radio_id.trim(),
    department_id: !form.department_id,
    geo: !hasCoords || !!coordError,
  };
  const isValid = !Object.values(missing).some(Boolean) && !uploading;
  const required = t("common.required", "Required");
  const err = (k: keyof typeof missing) =>
    submitted && missing[k] && k !== "geo"
      ? required
      : serverErrors[k]?.[0] || undefined;

  const goBack = () => navigate("/unit-management/fire-stations");

  const onFile = async (file?: File) => {
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
        t("unitManagement.imageTooLarge", "Image must be 2 MB or smaller"),
      );
      return;
    }
    setUploading(true);
    try {
      const uploaded = await iconApi.upload(file);
      setForm((f) => ({ ...f, icon: uploaded.path }));
      setLocalPreview(URL.createObjectURL(file));
    } catch (e) {
      toast.error(
        parseApiError(e).message ||
          t("unitManagement.uploadFailed", "Could not upload the icon"),
      );
    } finally {
      setUploading(false);
    }
  };

  const buildPayload = (): ServicePointInput => ({
    name: form.name.trim(),
    alt_name: form.alt_name.trim() || null,
    department_id: form.department_id,
    radio_id: form.radio_id.trim(),
    location_id: form.location_id || null,
    location_name: form.geo?.address ?? existing?.location_name ?? null,
    location: { lat: form.geo!.latitude, lng: form.geo!.longitude },
    active_till_date:
      form.is_active && form.active_till_date
        ? format(form.active_till_date, "yyyy-MM-dd")
        : null,
    is_active: form.is_active,
    icon: form.icon ?? null,
    resource_ids: form.unit_ids,
  });

  const { data: servicePoints = [] } = useQuery({
    queryKey: ["dispatcher", "service-points", "all"],
    queryFn: servicePointApi.all,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit
        ? servicePointApi.update(id!, buildPayload())
        : servicePointApi.create(buildPayload()),
    onSuccess: () => {
      toast.success(t("common.success", "Saved successfully"));
      queryClient.invalidateQueries({ queryKey: ["dispatcher"] });
      goBack();
    },
    onError: (e) => {
      const { status, message, fields } = parseApiError(e);
      if (status === 409) {
        // Duplicate: report it as a toast, name first, then radio ID. The
        // loaded stations tell which field clashes; the API message is the
        // fallback when the list isn't available.
        const norm = (v?: string | null) => (v ?? "").trim().toLowerCase();
        const others = servicePoints.filter(
          (s) => s.id !== id && s.department_id === form.department_id,
        );
        const msg = norm(message);
        const nameDup =
          others.some((s) => norm(s.name) === norm(form.name)) ||
          (!others.length && msg.includes("name"));
        const radioDup =
          others.some(
            (s) =>
              !!form.radio_id.trim() &&
              norm(s.radio_id) === norm(form.radio_id),
          ) ||
          (!others.length && msg.includes("radio"));
        const nameMsg = t(
          "unitManagement.fireStationNameExists",
          "A fire station with this name already exists",
        );
        const radioMsg = t(
          "unitManagement.radioIdExists",
          "This radio ID already exists in the department",
        );
        // Shown as a toast and inline under the clashing field.
        setServerErrors(
          nameDup
            ? { name: [nameMsg] }
            : radioDup
              ? { radio_id: [radioMsg] }
              : {},
        );
        toast.error(
          nameDup
            ? nameMsg
            : radioDup
              ? radioMsg
              : message ||
                t(
                  "unitManagement.fireStationDuplicate",
                  "A fire station with these details already exists",
                ),
        );
      } else {
        setServerErrors(fields);
        toast.error(
          message ||
            t(
              "unitManagement.saveFailedStation",
              "Could not save the fire station",
            ),
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
          error={err("name")}
        />
        <Input
          label={t(
            "unitManagement.fireStationNameAr",
            "Fire Station Name Arabic",
          )}
          dir="rtl"
          value={form.alt_name}
          onChange={text("alt_name")}
          error={serverErrors.alt_name?.[0]}
        />
        <Input
          label={t(
            "unitManagement.radioUniqueId",
            "Fire Station Radio Unique ID",
          )}
          required
          value={form.radio_id}
          onChange={text("radio_id")}
          error={err("radio_id")}
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
          error={err("department_id")}
        />
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
            value={form.active_till_date}
            onChange={(d) => setForm((f) => ({ ...f, active_till_date: d }))}
            disabled={!form.is_active}
            disabledDate={{ before: startOfToday() }}
            placeholder={t("unitManagement.activeTillDate", "Active Till Date")}
          />
        </div>
        <div className="md:col-span-2 xl:col-span-3">
          <MultiSelect
            label={t("unitManagement.assignUnits", "Assign Units")}
            options={assignableUnits.map((u) => ({
              value: u.id,
              label: u.unique_id ? `${u.name} (${u.unique_id})` : u.name,
            }))}
            value={form.unit_ids}
            onChange={(v) => setForm((f) => ({ ...f, unit_ids: v }))}
            placeholder={t("unitManagement.selectUnits", "Select units")}
            emptyMessage={t(
              "unitManagement.noUnitsToAssign",
              "All units are already assigned to fire stations",
            )}
            searchable
            showSelectAll
          />
        </div>
      </Section>

      <Section icon={Shapes} title={t("unitManagement.sectionFsIcon", "Icon")}>
        <div className="md:col-span-2 xl:col-span-3 flex items-center gap-5">
          <div className="w-24 h-24 shrink-0 rounded-xl border-2 border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] flex items-center justify-center overflow-hidden">
            {localPreview ? (
              <img
                src={localPreview}
                alt=""
                className="w-16 h-16 object-contain"
              />
            ) : (
              <DispatchIcon
                path={form.icon}
                fallback={Building2}
                className="w-16 h-16"
              />
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                isLoading={uploading}
                leftIcon={<ImagePlus className="w-4 h-4" />}
                onClick={() => fileRef.current?.click()}
              >
                {t("unitManagement.uploadIcon", "Upload Icon")}
              </Button>
              {form.icon && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  onClick={() => {
                    setForm((f) => ({ ...f, icon: undefined }));
                    setLocalPreview(undefined);
                  }}
                >
                  {t("unitManagement.removeImage", "Remove image")}
                </Button>
              )}
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {t("unitManagement.iconHint", "PNG, JPG or SVG, max 2 MB")}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
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
        <Button
          onClick={onSave}
          isLoading={saveMutation.isPending}
          disabled={uploading}
        >
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
    queryKey: ["dispatcher", "fire-stations", "detail", id],
    queryFn: () => servicePointApi.get(id!),
    enabled: !!id,
  });

  if (id && isLoading) {
    return (
      <div className="p-12 text-center text-[hsl(var(--muted-foreground))]">
        {t("common.loading", "Loading...")}
      </div>
    );
  }

  return <FireStationFormInner key={id ?? "new"} id={id} existing={existing} />;
};
