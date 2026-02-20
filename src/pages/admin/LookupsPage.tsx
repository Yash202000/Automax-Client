import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Database,
  Tag,
  AlertTriangle,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { lookupApi } from '../../api/admin';
import type {
  LookupCategory,
  LookupValue,
  LookupCategoryCreateRequest,
  LookupCategoryUpdateRequest,
  LookupValueCreateRequest,
  LookupValueUpdateRequest,
  FieldType,
  ValidationRules,
} from '../../types';
import { cn } from '@/lib/utils';
import { Button } from '../../components/ui';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../constants/permissions';

// Category Form Data
interface CategoryFormData {
  code: string;
  name: string;
  name_ar: string;
  description: string;
  is_active: boolean;
  add_to_incident_form: boolean;
  field_type: FieldType;
  validation_rules: ValidationRules;
}

const initialCategoryFormData: CategoryFormData = {
  code: '',
  name: '',
  name_ar: '',
  description: '',
  is_active: true,
  add_to_incident_form: false,
  field_type: 'select',
  validation_rules: {},
};

// Value Form Data
interface ValueFormData {
  code: string;
  name: string;
  name_ar: string;
  description: string;
  sort_order: number;
  color: string;
  is_default: boolean;
  is_active: boolean;
}

const initialValueFormData: ValueFormData = {
  code: '',
  name: '',
  name_ar: '',
  description: '',
  sort_order: 0,
  color: '#3B82F6',
  is_default: false,
  is_active: true,
};

// Predefined colors for values
const colorOptions = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#14B8A6', // Teal
];

export const LookupsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const canCreateLookup = isSuperAdmin || hasPermission(PERMISSIONS.LOOKUPS_CREATE);

  // State
  const [selectedCategory, setSelectedCategory] = useState<LookupCategory | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isValueModalOpen, setIsValueModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LookupCategory | null>(null);
  const [editingValue, setEditingValue] = useState<LookupValue | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>(initialCategoryFormData);
  const [valueFormData, setValueFormData] = useState<ValueFormData>(initialValueFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'category' | 'value'; id: string } | null>(null);

  // Fetch categories
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['admin', 'lookups', 'categories'],
    queryFn: () => lookupApi.listCategories(),
  });

  const categories: LookupCategory[] = categoriesData?.data || [];

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: LookupCategoryCreateRequest) => lookupApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lookups', 'categories'] });
      closeCategoryModal();
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: LookupCategoryUpdateRequest }) =>
      lookupApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lookups', 'categories'] });
      closeCategoryModal();
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => lookupApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lookups', 'categories'] });
      if (selectedCategory?.id === deleteConfirm?.id) {
        setSelectedCategory(null);
      }
      setDeleteConfirm(null);
    },
  });

  // Value mutations
  const createValueMutation = useMutation({
    mutationFn: ({ categoryId, data }: { categoryId: string; data: LookupValueCreateRequest }) =>
      lookupApi.createValue(categoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lookups', 'categories'] });
      closeValueModal();
    },
  });

  const updateValueMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: LookupValueUpdateRequest }) =>
      lookupApi.updateValue(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lookups', 'categories'] });
      closeValueModal();
    },
  });

  const deleteValueMutation = useMutation({
    mutationFn: (id: string) => lookupApi.deleteValue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lookups', 'categories'] });
      setDeleteConfirm(null);
    },
  });

  // Category modal handlers
  const openCreateCategoryModal = () => {
    setEditingCategory(null);
    setCategoryFormData(initialCategoryFormData);
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category: LookupCategory) => {
    setEditingCategory(category);

    // Parse validation rules from JSON string
    let validationRules: ValidationRules = {};
    if (category.validation_rules) {
      try {
        validationRules = JSON.parse(category.validation_rules);
      } catch (e) {
        validationRules = {};
      }
    }

    setCategoryFormData({
      code: category.code,
      name: category.name,
      name_ar: category.name_ar || '',
      description: category.description || '',
      is_active: category.is_active,
      add_to_incident_form: category.add_to_incident_form || false,
      field_type: (category.field_type || 'select') as FieldType,
      validation_rules: validationRules,
    });
    setIsCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    setCategoryFormData(initialCategoryFormData);
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Convert validation_rules object to JSON string
    const validationRulesJSON = Object.keys(categoryFormData.validation_rules).length > 0
      ? JSON.stringify(categoryFormData.validation_rules)
      : '';

    const payload: LookupCategoryUpdateRequest = {
      code: categoryFormData.code.toUpperCase(),
      name: categoryFormData.name,
      name_ar: categoryFormData.name_ar || undefined,
      description: categoryFormData.description || undefined,
      is_active: categoryFormData.is_active,
      add_to_incident_form: categoryFormData.add_to_incident_form,
      field_type: categoryFormData.field_type,
      validation_rules: validationRulesJSON || undefined,
    };

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: payload });
    } else {
      createCategoryMutation.mutate(payload as LookupCategoryCreateRequest);
    }
  };

  // Value modal handlers
  const openCreateValueModal = () => {
    if (!selectedCategory) return;
    setEditingValue(null);
    setValueFormData({
      ...initialValueFormData,
      sort_order: (selectedCategory.values?.length || 0) + 1,
    });
    setIsValueModalOpen(true);
  };

  const openEditValueModal = (value: LookupValue) => {
    setEditingValue(value);
    setValueFormData({
      code: value.code,
      name: value.name,
      name_ar: value.name_ar || '',
      description: value.description || '',
      sort_order: value.sort_order,
      color: value.color || '#3B82F6',
      is_default: value.is_default,
      is_active: value.is_active,
    });
    setIsValueModalOpen(true);
  };

  const closeValueModal = () => {
    setIsValueModalOpen(false);
    setEditingValue(null);
    setValueFormData(initialValueFormData);
  };

  const handleValueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;

    const payload = {
      code: valueFormData.code.toUpperCase(),
      name: valueFormData.name,
      name_ar: valueFormData.name_ar || undefined,
      description: valueFormData.description || undefined,
      sort_order: valueFormData.sort_order,
      color: valueFormData.color || undefined,
      is_default: valueFormData.is_default,
      is_active: valueFormData.is_active,
    };

    if (editingValue) {
      updateValueMutation.mutate({ id: editingValue.id, data: payload });
    } else {
      createValueMutation.mutate({ categoryId: selectedCategory.id, data: payload as LookupValueCreateRequest });
    }
  };

  // Get display name based on language
  const getDisplayName = (item: { name: string; name_ar?: string }) => {
    if (i18n.language === 'ar' && item.name_ar) {
      return item.name_ar;
    }
    return item.name;
  };

  // Get values for selected category
  const selectedCategoryValues = selectedCategory?.values || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-linear-to-br from-primary to-accent">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">{t('lookups.title')}</h2>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">{t('lookups.subtitle')}</p>
        </div>
      </div>

      {/* Two Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Categories */}
        <div className="lg:col-span-1"> 
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden">
            {/* Categories Header */}
            <div className="px-4 py-3 bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">{t('lookups.categories')}</h3>
              {canCreateLookup && (
                <button
                  onClick={openCreateCategoryModal}
                  className="p-1.5 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                  title={t('lookups.addCategory')}
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Categories List */}
            <div className="max-h-[600px] overflow-y-auto">
              {categoriesLoading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : categories.length === 0 ? (
                <div className="p-8 text-center">
                  <Database className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-2" />
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('lookups.noCategories')}</p>
                </div>
              ) : (
                <div className="divide-y divide-[hsl(var(--border))]">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        "px-4 py-3 cursor-pointer transition-colors group",
                        selectedCategory?.id === category.id
                          ? "bg-[hsl(var(--primary)/0.1)] border-l-2 border-l-[hsl(var(--primary))]"
                          : "hover:bg-[hsl(var(--muted)/0.5)]"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-lg flex items-center justify-center flex-shrink-0">
                            <Tag className="w-4 h-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                                {getDisplayName(category)}
                              </h4>
                              {category.is_system && (
                                <Lock className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                              )}
                            </div>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono">{category.code}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(category.field_type === 'select' || category.field_type === 'multiselect' || !category.field_type) ? (
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">
                              {category.values_count} {t('lookups.values')}
                            </span>
                          ) : (
                            <span className="text-xs text-[hsl(var(--muted-foreground))] font-medium">
                              {category.field_type}
                            </span>
                          )}
                          <ChevronRight className={cn(
                            "w-4 h-4 text-[hsl(var(--muted-foreground))] rtl:-rotate-180 transition-transform",
                            selectedCategory?.id === category.id && "transform rotate-90 rtl:rotate-90"
                          )} />
                        </div>
                      </div>
                      {/* Actions on hover */}
                      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditCategoryModal(category);
                          }}
                          className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                          title={t('lookups.editCategory')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!category.is_system && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm({ type: 'category', id: category.id });
                            }}
                            className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
                            title={t('lookups.deleteCategory')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Values */}
        <div className="lg:col-span-2">
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden">
            {/* Values Header */}
            <div className="px-4 py-3 bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                  {selectedCategory ? getDisplayName(selectedCategory) : t('lookups.values')}
                </h3>
                {selectedCategory && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {selectedCategory.description || t('lookups.noDescription')}
                  </p>
                )}
              </div>
              {selectedCategory && canCreateLookup && (selectedCategory.field_type === 'select' || selectedCategory.field_type === 'multiselect' || !selectedCategory.field_type) && (
                <button
                  onClick={openCreateValueModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t('lookups.addValue')}
                </button>
              )}
            </div>

            {/* Values Content */}
            {!selectedCategory ? (
              <div className="p-12 text-center">
                <Database className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
                <p className="text-[hsl(var(--muted-foreground))]">{t('lookups.selectCategory')}</p>
              </div>
            ) : selectedCategory.field_type && selectedCategory.field_type !== 'select' && selectedCategory.field_type !== 'multiselect' ? (
              <div className="p-12 text-center">
                <AlertTriangle className="w-12 h-12 text-[hsl(var(--warning))] mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">Values Not Applicable</h3>
                <p className="text-[hsl(var(--muted-foreground))] mb-2">
                  This category uses field type: <span className="font-semibold text-[hsl(var(--primary))]">{selectedCategory.field_type}</span>
                </p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Values are only required for <strong>Select</strong> and <strong>Multi-select</strong> field types.
                </p>
              </div>
            ) : selectedCategoryValues.length === 0 ? (
              <div className="p-12 text-center">
                <Tag className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">{t('lookups.noValues')}</h3>
                <p className="text-[hsl(var(--muted-foreground))] mb-4">{t('lookups.noValuesDesc')}</p>
                {canCreateLookup && (
                  <Button onClick={openCreateValueModal} leftIcon={<Plus className="w-4 h-4" />}>
                    {t('lookups.addValue')}
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[hsl(var(--muted)/0.3)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t('lookups.color')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t('lookups.valueName')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t('lookups.valueCode')}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t('lookups.sortOrder')}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t('lookups.isDefault')}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t('lookups.isActive')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {selectedCategoryValues.map((value) => (
                      <tr key={value.id} className="hover:bg-[hsl(var(--muted)/0.3)] transition-colors">
                        <td className="px-4 py-3">
                          <div
                            className="w-6 h-6 rounded-md border border-[hsl(var(--border))]"
                            style={{ backgroundColor: value.color || '#6B7280' }}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                              {getDisplayName(value)}
                            </p>
                            {value.name_ar && i18n.language !== 'ar' && (
                              <p className="text-xs text-[hsl(var(--muted-foreground))]">{value.name_ar}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{value.code}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-[hsl(var(--foreground))]">{value.sort_order}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {value.is_default && (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                              {t('lookups.default')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              "inline-flex px-2 py-0.5 text-xs font-medium rounded-full",
                              value.is_active
                                ? "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]"
                                : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                            )}
                          >
                            {value.is_active ? t('lookups.active') : t('lookups.inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditValueModal(value)}
                              className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                              title={t('lookups.editValue')}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ type: 'value', id: value.id })}
                              className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
                              title={t('lookups.deleteValue')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
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
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {deleteConfirm.type === 'category' ? t('lookups.deleteCategory') : t('lookups.deleteValue')}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    {deleteConfirm.type === 'category'
                      ? t('lookups.deleteCategoryConfirm')
                      : t('lookups.deleteValueConfirm')}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (deleteConfirm.type === 'category') {
                      deleteCategoryMutation.mutate(deleteConfirm.id);
                    } else {
                      deleteValueMutation.mutate(deleteConfirm.id);
                    }
                  }}
                  isLoading={deleteCategoryMutation.isPending || deleteValueMutation.isPending}
                >
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.25)]">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {editingCategory ? t('lookups.editCategory') : t('lookups.addCategory')}
                  </h3>
                </div>
              </div>
              <button
                onClick={closeCategoryModal}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCategorySubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-6 space-y-4">
                {editingCategory?.is_system && (
                  <div className="flex items-center gap-2 p-3 bg-[hsl(var(--warning)/0.1)] border border-[hsl(var(--warning)/0.2)] rounded-xl text-sm text-[hsl(var(--warning))]">
                    <Lock className="w-4 h-4" />
                    {t('lookups.systemCategoryNote')}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t('lookups.categoryCode')} *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., PRIORITY"
                    value={categoryFormData.code}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                    required
                    disabled={editingCategory?.is_system}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t('lookups.categoryName')} *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Priority"
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t('lookups.categoryNameAr')}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., الأولوية"
                    value={categoryFormData.name_ar}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name_ar: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t('common.description')}
                  </label>
                  <textarea
                    placeholder={t('lookups.descriptionPlaceholder')}
                    value={categoryFormData.description}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    Field Type
                  </label>
                  <select
                    value={categoryFormData.field_type}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, field_type: e.target.value as FieldType })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                    disabled={editingCategory?.is_system}
                  >
                    <option value="select">Select (Dropdown)</option>
                    <option value="multiselect">Multi-select</option>
                    <option value="text">Text</option>
                    <option value="textarea">Textarea</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="checkbox">Checkbox</option>
                  </select>
                  {categoryFormData.field_type !== 'select' && categoryFormData.field_type !== 'multiselect' && editingCategory && (editingCategory.values_count || 0) > 0 && (
                    <p className="mt-2 text-xs text-[hsl(var(--warning))] flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3" />
                      Warning: This category has {editingCategory.values_count} value(s). Non-select field types don't use values.
                    </p>
                  )}
                </div>

                {(categoryFormData.field_type === 'text' || categoryFormData.field_type === 'textarea') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                        Min Length
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={categoryFormData.validation_rules.minLength || ''}
                        onChange={(e) => setCategoryFormData({
                          ...categoryFormData,
                          validation_rules: { ...categoryFormData.validation_rules, minLength: e.target.value ? parseInt(e.target.value) : undefined }
                        })}
                        className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                        Max Length
                      </label>
                      <input
                        type="number"
                        placeholder="100"
                        value={categoryFormData.validation_rules.maxLength || ''}
                        onChange={(e) => setCategoryFormData({
                          ...categoryFormData,
                          validation_rules: { ...categoryFormData.validation_rules, maxLength: e.target.value ? parseInt(e.target.value) : undefined }
                        })}
                        className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                      />
                    </div>
                  </div>
                )}

                {categoryFormData.field_type === 'number' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                        Min Value
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={categoryFormData.validation_rules.minValue || ''}
                        onChange={(e) => setCategoryFormData({
                          ...categoryFormData,
                          validation_rules: { ...categoryFormData.validation_rules, minValue: e.target.value ? parseFloat(e.target.value) : undefined }
                        })}
                        className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                        Max Value
                      </label>
                      <input
                        type="number"
                        placeholder="999"
                        value={categoryFormData.validation_rules.maxValue || ''}
                        onChange={(e) => setCategoryFormData({
                          ...categoryFormData,
                          validation_rules: { ...categoryFormData.validation_rules, maxValue: e.target.value ? parseFloat(e.target.value) : undefined }
                        })}
                        className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="category_is_active"
                      checked={categoryFormData.is_active}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                      disabled={editingCategory?.is_system}
                    />
                    <label htmlFor="category_is_active" className="text-sm text-[hsl(var(--foreground))]">
                      {t('lookups.isActive')}
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="category_add_to_incident"
                      checked={categoryFormData.add_to_incident_form}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, add_to_incident_form: e.target.checked })}
                      className="w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                    />
                    <label htmlFor="category_add_to_incident" className="text-sm text-[hsl(var(--foreground))]">
                      {t('lookups.addToIncidentForm')}
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
                <Button variant="ghost" type="button" onClick={closeCategoryModal}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  isLoading={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                  leftIcon={!(createCategoryMutation.isPending || updateCategoryMutation.isPending) ? <Check className="w-4 h-4" /> : undefined}
                >
                  {editingCategory ? t('common.update') : t('common.create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Value Modal */}
      {isValueModalOpen && selectedCategory && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.25)]">
                  <Tag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {editingValue ? t('lookups.editValue') : t('lookups.addValue')}
                  </h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{getDisplayName(selectedCategory)}</p>
                </div>
              </div>
              <button
                onClick={closeValueModal}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleValueSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t('lookups.valueCode')} *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., CRITICAL"
                    value={valueFormData.code}
                    onChange={(e) => setValueFormData({ ...valueFormData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t('lookups.valueName')} *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Critical"
                    value={valueFormData.name}
                    onChange={(e) => setValueFormData({ ...valueFormData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t('lookups.valueNameAr')}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., حرج"
                    value={valueFormData.name_ar}
                    onChange={(e) => setValueFormData({ ...valueFormData, name_ar: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                    dir="rtl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t('lookups.sortOrder')}
                    </label>
                    <input
                      type="number"
                      value={valueFormData.sort_order}
                      onChange={(e) => setValueFormData({ ...valueFormData, sort_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t('lookups.color')}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={valueFormData.color}
                        onChange={(e) => setValueFormData({ ...valueFormData, color: e.target.value })}
                        className="w-10 h-10 rounded-lg border border-[hsl(var(--border))] cursor-pointer"
                      />
                      <div className="flex-1 flex flex-wrap gap-1">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setValueFormData({ ...valueFormData, color })}
                            className={cn(
                              "w-6 h-6 rounded-md border-2 transition-transform hover:scale-110",
                              valueFormData.color === color ? "border-[hsl(var(--foreground))]" : "border-transparent"
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t('common.description')}
                  </label>
                  <textarea
                    placeholder={t('lookups.descriptionPlaceholder')}
                    value={valueFormData.description}
                    onChange={(e) => setValueFormData({ ...valueFormData, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all resize-none"
                  />
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="value_is_default"
                      checked={valueFormData.is_default}
                      onChange={(e) => setValueFormData({ ...valueFormData, is_default: e.target.checked })}
                      className="w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                    />
                    <label htmlFor="value_is_default" className="text-sm text-[hsl(var(--foreground))]">
                      {t('lookups.isDefault')}
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="value_is_active"
                      checked={valueFormData.is_active}
                      onChange={(e) => setValueFormData({ ...valueFormData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                    />
                    <label htmlFor="value_is_active" className="text-sm text-[hsl(var(--foreground))]">
                      {t('lookups.isActive')}
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
                <Button variant="ghost" type="button" onClick={closeValueModal}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  isLoading={createValueMutation.isPending || updateValueMutation.isPending}
                  leftIcon={!(createValueMutation.isPending || updateValueMutation.isPending) ? <Check className="w-4 h-4" /> : undefined}
                >
                  {editingValue ? t('common.update') : t('common.create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
