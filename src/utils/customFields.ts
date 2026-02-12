import type { LookupCategory } from '../types';

export interface CustomLookupField {
  value: any;
  field_type: string;
  category_id: string;
  category_name?: string;
  category_name_ar?: string;
}

/**
 * Parse custom lookup fields from the custom_fields JSON string
 * @param customFieldsJson - The JSON string from incident.custom_fields
 * @param lookupCategories - Array of lookup categories to get names from
 * @returns Object with custom lookup fields keyed by "lookup:CODE"
 */
export function parseCustomLookupFields(
  customFieldsJson: string | undefined,
  lookupCategories: LookupCategory[]
): Record<string, CustomLookupField> {
  if (!customFieldsJson) return {};

  try {
    const customFields = JSON.parse(customFieldsJson);
    const customLookups: Record<string, CustomLookupField> = {};

    for (const [key, fieldData] of Object.entries(customFields)) {
      if (key.startsWith('lookup:')) {
        const data = fieldData as any;
        // Find the category to get its name
        const category = lookupCategories.find(c => c.id === data.category_id);
        customLookups[key] = {
          ...data,
          category_name: category?.name,
          category_name_ar: category?.name_ar,
        };
      }
    }

    return customLookups;
  } catch (e) {
    console.error('Failed to parse custom_fields:', e);
    return {};
  }
}

/**
 * Format a custom lookup field value for display
 * @param field - The custom lookup field
 * @param language - Current language ('en' or 'ar')
 * @param t - Translation function
 * @returns Formatted display value
 */
export function formatCustomLookupValue(
  field: CustomLookupField,
  language: string,
  t: (key: string, defaultValue?: string) => string
): string {
  if (field.value === null || field.value === undefined) {
    return '-';
  }

  switch (field.field_type) {
    case 'checkbox':
      return field.value ? t('common.yes', 'Yes') : t('common.no', 'No');

    case 'date':
      try {
        return new Date(field.value).toLocaleString(language);
      } catch (e) {
        return String(field.value);
      }

    case 'multiselect':
      if (Array.isArray(field.value)) {
        return field.value.join(', ');
      }
      return String(field.value);

    default:
      return String(field.value);
  }
}
