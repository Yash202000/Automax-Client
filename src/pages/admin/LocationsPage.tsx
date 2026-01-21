import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  MapPin,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Globe,
  Building,
  Warehouse,
} from 'lucide-react';
import { locationApi } from '../../api/admin';
import type { Location, LocationCreateRequest, LocationUpdateRequest } from '../../types';
import { cn } from '@/lib/utils';
import { Button } from '../../components/ui';

interface LocationFormData {
  name: string;
  code: string;
  description: string;
  type: string;
  parent_id: string;
  parent_name: string;
  address: string;
}

const initialFormData: LocationFormData = {
  name: '',
  code: '',
  description: '',
  type: 'office',
  parent_id: '',
  parent_name: '',
  address: '',
};

const locationTypes = [
  { value: 'country', label: 'Country', icon: Globe },
  { value: 'state', label: 'State/Province', icon: MapPin },
  { value: 'city', label: 'City', icon: Building },
  { value: 'district', label: 'District', icon: MapPin },
  { value: 'office', label: 'Office', icon: Building },
  { value: 'warehouse', label: 'Warehouse', icon: Warehouse },
  { value: 'branch', label: 'Branch', icon: Building },
];

const typeGradients: Record<string, string> = {
  country: 'from-[hsl(var(--primary))] to-[hsl(var(--accent))]',
  state: 'from-blue-500 to-cyan-500',
  city: 'from-emerald-500 to-teal-500',
  district: 'from-amber-500 to-orange-500',
  office: 'from-indigo-500 to-blue-500',
  warehouse: 'from-orange-500 to-red-500',
  branch: 'from-rose-500 to-pink-500',
};

const typeBadgeColors: Record<string, string> = {
  country: 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]',
  state: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  city: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]',
  district: 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]',
  office: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  warehouse: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  branch: 'bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]',
};

interface TreeNodeProps {
  location: Location;
  level: number;
  onAdd: (parentId: string, parentName: string) => void;
  onEdit: (loc: Location) => void;
  onDelete: (id: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ location, level, onAdd, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = location.children && location.children.length > 0;
  const gradient = typeGradients[location.type] || 'from-[hsl(var(--muted-foreground))] to-[hsl(var(--foreground))]';

  return (
    <div>
      <div
        className="flex items-center justify-between py-3.5 px-4 hover:bg-[hsl(var(--muted)/0.5)] transition-colors group"
        style={{ paddingLeft: `${level * 28 + 20}px` }}
      >
        <div className="flex items-center gap-3">
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              )}
            </button>
          ) : (
            <span className="w-7" />
          )}
          <div className={cn("w-10 h-10 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-md", gradient)}>
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">{location.name}</h4>
              <span className={cn("px-2 py-0.5 text-xs font-medium rounded-md capitalize", typeBadgeColors[location.type] || 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]')}>
                {location.type}
              </span>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono">{location.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-lg",
              location.is_active
                ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]'
                : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
            )}
          >
            {location.is_active ? 'Active' : 'Inactive'}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onAdd(location.id, location.name)}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.1)] rounded-lg transition-colors"
              title="Add Child Location"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(location)}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(location.id)}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {location.children!.map((child) => (
            <TreeNode
              key={child.id}
              location={child}
              level={level + 1}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const LocationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState<LocationFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: treeData, isLoading } = useQuery({
    queryKey: ['admin', 'locations', 'tree'],
    queryFn: () => locationApi.getTree(),
  });

  const { data: locationsList } = useQuery({
    queryKey: ['admin', 'locations', 'list'],
    queryFn: () => locationApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: LocationCreateRequest) => locationApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'locations'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: LocationUpdateRequest }) =>
      locationApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'locations'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => locationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'locations'] });
      setDeleteConfirm(null);
    },
  });

  const openCreateModal = (parentId: string = '', parentName: string = '') => {
    setEditingLocation(null);
    setFormData({
      ...initialFormData,
      parent_id: parentId,
      parent_name: parentName,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (location: Location) => {
    const parentLoc = locationsList?.data?.find((l: Location) => l.id === location.parent_id);
    setEditingLocation(location);
    setFormData({
      name: location.name,
      code: location.code,
      description: location.description,
      type: location.type,
      parent_id: location.parent_id || '',
      parent_name: parentLoc?.name || '',
      address: location.address,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      code: formData.code,
      description: formData.description,
      type: formData.type,
      parent_id: formData.parent_id || undefined,
      address: formData.address,
    };

    if (editingLocation) {
      updateMutation.mutate({ id: editingLocation.id, data: payload });
    } else {
      createMutation.mutate(payload as LocationCreateRequest);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
              <MapPin className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">Locations</h2>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">Manage organizational locations and geography</p>
        </div>
      </div>

      {/* Location Types Legend */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-5">
        <p className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">Location Types</p>
        <div className="flex flex-wrap gap-2">
          {locationTypes.map((type) => (
            <div
              key={type.value}
              className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg", typeBadgeColors[type.value])}
            >
              <type.icon className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{type.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Location Tree */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden">
        {/* Header with Add Root Button */}
        <div className="px-6 py-4 bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.2)]">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Location Hierarchy</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {treeData?.data?.length || 0} root locations
              </p>
            </div>
          </div>
          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-colors text-sm font-medium shadow-md shadow-[hsl(var(--primary)/0.25)]"
          >
            <Plus className="w-4 h-4" />
            Add Root Location
          </button>
        </div>

        {/* Tree Content */}
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[hsl(var(--muted-foreground))]">Loading locations...</p>
          </div>
        ) : treeData?.data?.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[hsl(var(--primary)/0.25)]">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">No locations yet</h3>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">Create your first location to organize your geography</p>
            <Button onClick={() => openCreateModal()} leftIcon={<Plus className="w-4 h-4" />}>
              Create Location
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--border))]">
            {treeData?.data?.map((loc: Location) => (
              <TreeNode
                key={loc.id}
                location={loc}
                level={0}
                onAdd={openCreateModal}
                onEdit={openEditModal}
                onDelete={setDeleteConfirm}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-[hsl(var(--destructive)/0.1)] rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-[hsl(var(--destructive))]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Delete Location</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    Are you sure you want to delete this location? All child locations will also be deleted.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(deleteConfirm)}
                  isLoading={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Location'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.25)]">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {editingLocation ? 'Edit Location' : 'Create Location'}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {editingLocation
                      ? 'Update location details'
                      : formData.parent_name
                        ? `Adding under "${formData.parent_name}"`
                        : 'Add a new root location'
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-6 space-y-4">
                {/* Parent Info Banner (when adding child) */}
                {!editingLocation && formData.parent_name && (
                  <div className="flex items-center gap-3 p-3 bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.2)] rounded-xl">
                    <MapPin className="w-5 h-5 text-[hsl(var(--primary))]" />
                    <div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Parent Location</p>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">{formData.parent_name}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Name</label>
                  <input
                    type="text"
                    placeholder="e.g., New York Office"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Code</label>
                  <input
                    type="text"
                    placeholder="e.g., NY-OFF"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                  >
                    {locationTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Only show parent selector when editing */}
                {editingLocation && (
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Parent Location</label>
                    <select
                      value={formData.parent_id}
                      onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                    >
                      <option value="">None (Root Level)</option>
                      {locationsList?.data
                        ?.filter((l: Location) => l.id !== editingLocation?.id)
                        .map((loc: Location) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} ({loc.type})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Address</label>
                  <textarea
                    placeholder="Enter the full address..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Description</label>
                  <textarea
                    placeholder="Describe this location..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all resize-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
                <Button variant="ghost" type="button" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={createMutation.isPending || updateMutation.isPending}
                  leftIcon={!(createMutation.isPending || updateMutation.isPending) ? <Check className="w-4 h-4" /> : undefined}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingLocation
                    ? 'Update'
                    : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
