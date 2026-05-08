// Category tree types (goal category hierarchy).
// Backend: /api/v1/admin/categories

export interface Category {
  id: string;
  name: string;
  name_ar?: string;
  code: string;
  description: string;
  description_ar?: string;
  parent_id: string | null;
  level: number;
  path: string;
  is_active: boolean;
  sort_order: number;
  children?: Category[];
  created_at: string;
  updated_at: string;
}

export interface CategoryCreateRequest {
  name: string;
  name_ar?: string;
  code: string;
  description?: string;
  description_ar?: string;
  parent_id?: string | null;
  sort_order?: number;
}

export interface CategoryUpdateRequest {
  name?: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface CategoryListParams {
  include_inactive?: boolean;
}
