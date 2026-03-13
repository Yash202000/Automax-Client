import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Tags,
  User,
  Radio,
  Calendar,
} from "lucide-react";
import { Button, TreeSelect } from "../ui";
import type { TreeSelectNode } from "../ui";
import {
  classificationApi,
  userApi,
  // locationApi,
  escalationApi,
} from "../../api/admin";
import type {
  Classification,
  User as UserType,
  CreateEscalationRequest,
} from "../../types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "../../stores/authStore";
import MultiSelect from "../ui/MultiSelect";
import Select from "../ui/SelectInput";
import { toast } from "sonner";

interface CreateEscalationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (id: string) => void;
  editData?: any;
}

export const CreateEscalationModal: React.FC<CreateEscalationProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editData,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  // Form state
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("");
  const [classificationId, setClassificationId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<UserType[]>([]);
  const [frequency, setFrequency] = useState("daily");
  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Query for incidents classifications
  const { data: classificationsData, isLoading: classificationsLoading } =
    useQuery({
      queryKey: ["classifications", "incident"],
      queryFn: async () => {
        // Get 'incidents', 'both', and 'all' types
        const [incidentRes, bothRes, allRes] = await Promise.all([
          classificationApi.getTreeByType("incident"),
          classificationApi.getTreeByType("both"),
          classificationApi.getTreeByType("all"),
        ]);
        const combined = [
          ...(incidentRes.data || []),
          ...(bothRes.data || []),
          ...(allRes.data || []),
        ];
        // Deduplicate by ID
        const unique = combined.filter(
          (item, index, self) =>
            index === self.findIndex((t) => t.id === item.id),
        );
        return { success: true, data: unique };
      },
      enabled: isOpen,
    });

  // Query for users (potential assignees)
  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () => userApi.list(1, 100),
    enabled: isOpen,
  });

  // Query for locations
  // const { data: locationsData } = useQuery({
  //   queryKey: ["locations", "tree"],
  //   queryFn: () => locationApi.getTree(),
  //   enabled: isOpen,
  // });

  const rawClassifications = classificationsData?.data || [];
  const users = usersData?.data || [];
  // const rawLocations = locationsData?.data || [];

  // Filter classifications based on user's assignments (unless super admin)
  const classifications = useMemo(() => {
    if (!user || user.is_super_admin) return rawClassifications;
    if (!user.classifications || user.classifications.length === 0)
      return rawClassifications;

    const userClassificationIds = new Set(
      user.classifications.map((c) => c.id),
    );

    const hasUserAccess = (node: Classification): boolean => {
      if (userClassificationIds.has(node.id)) return true;
      if (node.children && node.children.length > 0) {
        return node.children.some((child) => hasUserAccess(child));
      }
      return false;
    };

    const filterByUserAccess = (nodes: Classification[]): Classification[] => {
      return nodes
        .map((node) => {
          if (!hasUserAccess(node)) return null;
          const filteredNode: Classification = {
            ...node,
            children:
              node.children && node.children.length > 0
                ? filterByUserAccess(node.children)
                : undefined,
          };
          return filteredNode;
        })
        .filter(Boolean) as Classification[];
    };

    return filterByUserAccess(rawClassifications);
  }, [rawClassifications, user]);

  // Filter locations based on user's assignments (unless super admin)
  // const locations = useMemo(() => {
  //   if (!user || user.is_super_admin) return rawLocations;
  //   if (!user.locations || user.locations.length === 0) return rawLocations;

  //   const userLocationIds = new Set(user.locations.map((l) => l.id));

  //   const hasUserAccess = (node: any): boolean => {
  //     if (userLocationIds.has(node.id)) return true;
  //     if (node.children && node.children.length > 0) {
  //       return node.children.some((child: any) => hasUserAccess(child));
  //     }
  //     return false;
  //   };

  //   const filterByUserAccess = (nodes: any[]): any[] => {
  //     return nodes
  //       .map((node) => {
  //         if (!hasUserAccess(node)) return null;
  //         const filteredNode = {
  //           ...node,
  //           children:
  //             node.children && node.children.length > 0
  //               ? filterByUserAccess(node.children)
  //               : undefined,
  //         };
  //         return filteredNode;
  //       })
  //       .filter(Boolean);
  //   };

  //   return filterByUserAccess(rawLocations);
  // }, [rawLocations, user]);

  // Convert classifications to TreeSelectNode format
  const classificationTreeData: TreeSelectNode[] = useMemo(() => {
    const convertToTreeNode = (items: Classification[]): TreeSelectNode[] => {
      return items.map((item) => ({
        id: item.id,
        name: item.name,
        children:
          item.children && item.children.length > 0
            ? convertToTreeNode(item.children)
            : undefined,
      }));
    };
    return convertToTreeNode(classifications);
  }, [classifications]);

  //   useEffect(() => {
  //     const parts: string[] = [];

  //     // Add classification name
  //     if (classificationId) {
  //       const findClassificationName = (
  //         nodes: Classification[],
  //         id: string,
  //       ): string | null => {
  //         for (const node of nodes) {
  //           if (node.id === id) return node.name;
  //           if (node.children) {
  //             const found = findClassificationName(node.children, id);
  //             if (found) return found;
  //           }
  //         }
  //         return null;
  //       };
  //       const classificationName = findClassificationName(
  //         classifications,
  //         classificationId,
  //       );
  //       if (classificationName) parts.push(classificationName);
  //     }

  //     // Add location name
  //     if (locationId) {
  //       const findLocationName = (nodes: any[], id: string): string | null => {
  //         for (const node of nodes) {
  //           if (node.id === id) return node.name;
  //           if (node.children) {
  //             const found = findLocationName(node.children, id);
  //             if (found) return found;
  //           }
  //         }
  //         return null;
  //       };
  //       const locationName = findLocationName(locations, locationId);
  //       if (locationName) parts.push(locationName);
  //     }

  //     // Add geolocation area/address if available

  //     // Generate title from parts
  //     if (parts.length > 0) {
  //       const generatedTitle = parts.join(" - ");
  //       setTitle(generatedTitle);
  //     }
  //   }, [classificationId, locationId, classifications, locations]);

  // Create request mutation
  const createMutation = useMutation({
    mutationFn: async ({ data }: { data: CreateEscalationRequest }) => {
      const response = await escalationApi.create(data);
      return response;
    },
    onSuccess: (result) => {
      if (result.data?.id) {
        onSuccess(result.data.id);
        toast.success(t("escalation.createdSuccess"));
      }
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || t("escalation.createError"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateEscalationRequest) =>
      escalationApi.update(editData?.id, data),
    onSuccess: (result) => {
      toast.success(t("escalation.updatedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["admin", "escalations"] });
      onSuccess(result.data.id);
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || t("escalation.updateError"));
    },
  });

  useEffect(() => {
    if (!isOpen) return;

    if (editData) {
      setTitle(editData.name ?? "");
      setChannel(editData.channel ?? "");
      setClassificationId(editData.classification?.id ?? "");
      setLocationId(editData.location?.id ?? "");
      setFrequency(editData.frequency ?? "daily");
      setSelectedUsers(editData.users ?? []);
    } else {
      setTitle("");
      setChannel("");
      setClassificationId("");
      setLocationId("");
      setFrequency("daily");
      setSelectedUsers([]);
    }
    setErrors({});
  }, [isOpen, editData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = t("escalation.titleRequired");
    }

    if (!classificationId) {
      newErrors.classification = t("escalation.fieldRequired", {
        field: t("escalation.classification"),
      });
    }
    // if (!locationId) {
    //   newErrors.location = t("escalations.fieldRequired", {
    //     field: t("escalations.location"),
    //   });
    // }
    if (!channel) {
      newErrors.channel = t("escalation.fieldRequired", {
        field: t("escalation.channel"),
      });
    }

    if (!selectedUsers?.length) {
      newErrors.assignee = t("escalation.fieldRequired", {
        field: t("escalation.users", "Users"),
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const data: CreateEscalationRequest = {
      name: title.trim(),
      classification_id: classificationId,
      channel: channel.trim(),
      location_id: locationId,
      frequency: frequency,
      is_active: true,
      user_ids: selectedUsers.map((u) => u.id),
    };
    if (editData?.id) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate({ data });
    }
  };

  // const locationTree = locations as unknown as TreeSelectNode[];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-3xl w-full animate-scale-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-linear-to-br from-primary to-accent flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                {editData?.id ? t("escalation.edit") : t("escalation.create")}
              </h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {editData?.id
                  ? t("escalation.editDescription")
                  : t("escalation.createDescription")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t("escalation.title")} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("escalation.titlePlaceholder")}
                  className={cn(
                    "w-full px-4 py-2 bg-[hsl(var(--background))] border rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                    errors.title
                      ? "border-red-500"
                      : "border-[hsl(var(--border))]",
                  )}
                />
              </div>

              {errors.title && (
                <p className="text-xs text-red-500 mt-1">{errors.title}</p>
              )}
            </div>
          </div>

          <div className="space-y-3  bg-[hsl(var(--muted)/0.3)] rounded-lg border-[hsl(var(--border))]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {t("escalation.users")}
                  <span className="text-red-500">*</span>
                </h4>

                <MultiSelect
                  options={users.map((u) => ({
                    label: `${u.first_name} ${u.last_name} (${u.username})`,
                    value: u.id,
                  }))}
                  value={selectedUsers.map((u) => u.id)}
                  onChange={(ids) => {
                    const selectedUsers = users.filter((u) =>
                      ids.includes(u.id),
                    );
                    setSelectedUsers(selectedUsers);
                  }}
                  placeholder={t("escalation.userPlaceholder")}
                  error={errors?.assignee}
                  maxTagCount={1}
                  searchable
                />
              </div>
              {/* Classification */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                  <Tags className="w-3 h-3 inline me-1" />
                  {t("escalation.classification")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                {classificationsLoading ? (
                  <div className="flex items-center justify-center py-3">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <TreeSelect
                    data={classificationTreeData}
                    value={classificationId}
                    onChange={(id) => setClassificationId(id)}
                    placeholder={t("escalation.selectClassification")}
                    error={errors.classification}
                    leafOnly={true}
                    emptyMessage={t("escalation.noClassifications")}
                    maxHeight="200px"
                  />
                )}
              </div>
              {/* Location */}
              {/* <div className="space-y-2">
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  {t("requests.location", "Location")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <TreeSelect
                  data={locationTree}
                  value={locationId || ""}
                  onChange={(id) => setLocationId(id)}
                  placeholder={t(
                    "requests.selectLocation",
                    "Select location...",
                  )}
                  error={errors.location}
                  leafOnly={true}
                  emptyMessage={t(
                    "requests.noLocations",
                    "No locations available",
                  )}
                />
              </div> */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-muted-foreground">
                  <Radio className="w-3 h-3 inline me-1" />
                  {t("escalation.channel")}
                  <span className="text-red-500 ms-1">*</span>
                </label>

                <Select
                  options={[
                    { label: "SMS", value: "sms" },
                    { label: "Email", value: "email" },
                    { label: "Both", value: "both" },
                  ]}
                  value={channel}
                  onChange={(value) => setChannel(value)}
                  placeholder={t("escalation.channelPlaceholder")}
                  error={errors?.channel}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-muted-foreground">
                  <Calendar className="w-3 h-3 inline me-1" />
                  {t("escalation.reportFrequency")}
                </label>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="frequency"
                      value="daily"
                      checked={frequency === "daily"}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="accent-blue-500"
                    />
                    {t("escalation.daily")}
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="frequency"
                      value="weekly"
                      checked={frequency === "weekly"}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="accent-blue-500"
                    />
                    {t("escalation.weekly")}
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {createMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-4 h-4" />
                <p className="text-sm">
                  {(createMutation.error as Error)?.message ||
                    t("escalation.createError")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={createMutation.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
            isLoading={createMutation.isPending || updateMutation.isPending}
            leftIcon={
              !createMutation.isPending ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : undefined
            }
          >
            {editData?.id ? t("escalation.update") : t("escalation.create")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateEscalationModal;
