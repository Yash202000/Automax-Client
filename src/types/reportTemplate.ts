// Report Template Types

export interface PageSettings {
  size: 'A4' | 'Letter' | 'Legal' | 'A3';
  orientation: 'portrait' | 'landscape';
  margin_top: number;
  margin_right: number;
  margin_bottom: number;
  margin_left: number;
  width?: number;
  height?: number;
}

export interface HeaderConfig {
  enabled: boolean;
  height: number;
  background?: string;
  elements: TemplateElement[];
  show_on_all_pages: boolean;
}

export interface FooterConfig {
  enabled: boolean;
  height: number;
  background?: string;
  elements: TemplateElement[];
  show_page_number: boolean;
  page_number_format: string;
  show_on_all_pages: boolean;
}

export interface ElementPosition {
  x: number;
  y: number;
  anchor: 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  relative: boolean;
  parent_id?: string;
}

export interface ElementSize {
  width: number;
  height: number;
  min_width?: number;
  min_height?: number;
  max_width?: number;
  max_height?: number;
  unit: 'mm' | 'px' | 'percent';
  auto_height?: boolean;
}

export interface ElementStyle {
  background_color?: string;
  background_image?: string;
  border_width?: number;
  border_color?: string;
  border_style?: 'solid' | 'dashed' | 'dotted';
  border_radius?: number;
  shadow?: boolean;
  shadow_color?: string;
  shadow_blur?: number;
  shadow_offset_x?: number;
  shadow_offset_y?: number;
  opacity?: number;
  padding_top?: number;
  padding_right?: number;
  padding_bottom?: number;
  padding_left?: number;
}

export interface FontConfig {
  family: string;
  size: number;
  weight: 'normal' | 'bold';
  style: 'normal' | 'italic';
  color: string;
  line_height?: number;
}

export interface GlobalStyles {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color: string;
  default_font: FontConfig;
}

export type ElementType = 'text' | 'image' | 'table' | 'shape' | 'line' | 'spacer' | 'dynamic_field' | 'chart';

export interface TemplateElement {
  id: string;
  type: ElementType;
  position: ElementPosition;
  size: ElementSize;
  style: ElementStyle;
  content: TextContent | ImageContent | TableContent | ShapeContent | LineContent | DynamicFieldContent | ChartContent;
  locked: boolean;
  visible: boolean;
  z_index: number;
}

export interface TextContent {
  text: string;
  font: FontConfig;
  alignment: 'left' | 'center' | 'right' | 'justify';
  v_alignment: 'top' | 'middle' | 'bottom';
  word_wrap: boolean;
  truncate: boolean;
  max_lines?: number;
}

export interface ImageContent {
  source: string;
  source_type: 'url' | 'base64' | 'file';
  alt?: string;
  fit: 'contain' | 'cover' | 'fill' | 'none';
  position: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

export interface TableColumn {
  field: string;
  label: string;
  width: number;
  width_unit: 'mm' | 'percent';
  alignment: 'left' | 'center' | 'right';
  format?: string;
  style?: TableCellStyle;
}

export interface TableCellStyle {
  background_color?: string;
  text_color?: string;
  font?: FontConfig;
  border_width?: number;
  border_color?: string;
  padding?: number;
  v_alignment?: 'top' | 'middle' | 'bottom';
}

export interface TableContent {
  data_source: string;
  columns: TableColumn[];
  filters: ReportFilterConfig[];
  sorting: ReportSortConfig[];
  show_header: boolean;
  show_row_numbers: boolean;
  alternate_rows: boolean;
  header_style: TableCellStyle;
  row_style: TableCellStyle;
  alt_row_style: TableCellStyle;
  max_rows?: number;
  pagination: boolean;
  rows_per_page?: number;
}

export interface ReportFilterConfig {
  field: string;
  operator: string;
  value: unknown;
}

export interface ReportSortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ShapeContent {
  shape_type: 'rectangle' | 'circle' | 'ellipse' | 'triangle';
  fill_color?: string;
  stroke_color?: string;
  stroke_width?: number;
}

export interface LineContent {
  direction: 'horizontal' | 'vertical';
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  stroke_color: string;
  stroke_width: number;
  stroke_style: 'solid' | 'dashed' | 'dotted';
}

export interface DynamicFieldContent {
  field: 'date' | 'datetime' | 'page_number' | 'total_pages' | 'user_name' | 'report_name' | 'custom';
  format?: string;
  prefix?: string;
  suffix?: string;
  font: FontConfig;
  alignment: 'left' | 'center' | 'right';
  custom_value?: string;
}

export interface ChartContent {
  chart_type: 'bar' | 'line' | 'pie' | 'doughnut';
  data_source: string;
  x_field: string;
  y_field: string;
  group_field?: string;
  aggregation: 'count' | 'sum' | 'avg';
  colors: string[];
  show_legend: boolean;
  show_labels: boolean;
  title?: string;
  filters: ReportFilterConfig[];
}

export interface TemplateConfig {
  page_settings: PageSettings;
  header?: HeaderConfig;
  footer?: FooterConfig;
  elements: TemplateElement[];
  styles?: GlobalStyles;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  template: TemplateConfig;
  is_default: boolean;
  is_public: boolean;
  created_by?: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    avatar?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ReportTemplateCreateRequest {
  name: string;
  description?: string;
  template: TemplateConfig;
  is_public?: boolean;
}

export interface ReportTemplateUpdateRequest {
  name?: string;
  description?: string;
  template?: TemplateConfig;
  is_public?: boolean;
  is_default?: boolean;
}

export interface ColumnOverride {
  field: string;
  label: string;
  width?: number;
  alignment?: string;
}

export interface TemplateOverrides {
  title?: string;
  subtitle?: string;
  header_logo?: string;
  custom_texts?: Record<string, string>;
  columns?: ColumnOverride[];
}

export interface GenerateReportRequest {
  template_id: string;
  data_source: string;
  filters?: ReportFilterConfig[];
  sorting?: ReportSortConfig[];
  format: 'pdf' | 'xlsx';
  file_name?: string;
  overrides?: TemplateOverrides;
}

// Default values
export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  size: 'A4',
  orientation: 'portrait',
  margin_top: 15,
  margin_right: 15,
  margin_bottom: 15,
  margin_left: 15,
};

export const DEFAULT_FONT: FontConfig = {
  family: 'Arial',
  size: 12,
  weight: 'normal',
  style: 'normal',
  color: '#000000',
  line_height: 1.5,
};

export const DEFAULT_HEADER_STYLE: TableCellStyle = {
  background_color: '#3B82F6',
  text_color: '#FFFFFF',
  font: { ...DEFAULT_FONT, weight: 'bold', size: 10 },
  border_width: 1,
  border_color: '#2563EB',
  padding: 4,
  v_alignment: 'middle',
};

export const DEFAULT_ROW_STYLE: TableCellStyle = {
  background_color: '#FFFFFF',
  text_color: '#1F2937',
  font: { ...DEFAULT_FONT, size: 9 },
  border_width: 0.5,
  border_color: '#E5E7EB',
  padding: 3,
  v_alignment: 'middle',
};

export const DEFAULT_ALT_ROW_STYLE: TableCellStyle = {
  ...DEFAULT_ROW_STYLE,
  background_color: '#F9FAFB',
};

// Helper to create unique element IDs
export const generateElementId = (type: ElementType): string => {
  return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Helper to create default elements
export const createDefaultTextElement = (x: number, y: number): TemplateElement => ({
  id: generateElementId('text'),
  type: 'text',
  position: { x, y, anchor: 'top-left', relative: false },
  size: { width: 100, height: 20, unit: 'mm' },
  style: {},
  content: {
    text: 'New Text',
    font: DEFAULT_FONT,
    alignment: 'left',
    v_alignment: 'top',
    word_wrap: true,
    truncate: false,
  } as TextContent,
  locked: false,
  visible: true,
  z_index: 0,
});

export const createDefaultImageElement = (x: number, y: number): TemplateElement => ({
  id: generateElementId('image'),
  type: 'image',
  position: { x, y, anchor: 'top-left', relative: false },
  size: { width: 50, height: 50, unit: 'mm' },
  style: {},
  content: {
    source: '',
    source_type: 'url',
    fit: 'contain',
    position: 'center',
  } as ImageContent,
  locked: false,
  visible: true,
  z_index: 0,
});

export const createDefaultTableElement = (x: number, y: number, dataSource: string): TemplateElement => ({
  id: generateElementId('table'),
  type: 'table',
  position: { x, y, anchor: 'top-left', relative: true },
  size: { width: 0, height: 0, unit: 'mm', auto_height: true },
  style: {},
  content: {
    data_source: dataSource,
    columns: [],
    filters: [],
    sorting: [],
    show_header: true,
    show_row_numbers: false,
    alternate_rows: true,
    header_style: DEFAULT_HEADER_STYLE,
    row_style: DEFAULT_ROW_STYLE,
    alt_row_style: DEFAULT_ALT_ROW_STYLE,
    pagination: false,
  } as TableContent,
  locked: false,
  visible: true,
  z_index: 0,
});

export const createDefaultDynamicFieldElement = (x: number, y: number, field: DynamicFieldContent['field']): TemplateElement => ({
  id: generateElementId('dynamic_field'),
  type: 'dynamic_field',
  position: { x, y, anchor: 'top-left', relative: false },
  size: { width: 50, height: 10, unit: 'mm' },
  style: {},
  content: {
    field,
    font: { ...DEFAULT_FONT, size: 10 },
    alignment: 'left',
  } as DynamicFieldContent,
  locked: false,
  visible: true,
  z_index: 0,
});

export const createDefaultShapeElement = (
  x: number,
  y: number
): TemplateElement => ({
  id: generateElementId('shape'),
  type: 'shape',
  position: { x, y, anchor: 'top-left', relative: false },
  size: { width: 40, height: 30, unit: 'mm' },
  style: {
    background_color: '#e5e7eb',
    border_width: 1,
    border_color: '#000000',
    border_style: 'solid',
    border_radius: 0,
    opacity: 1,
  },
  content: {
    shape_type: 'rectangle', // rectangle | circle
  },
  locked: false,
  visible: true,
  z_index: 0,
});

export const createDefaultLineElement = (
  x: number,
  y: number
): TemplateElement => ({
  id: generateElementId('line'),
  type: 'line',
  position: { x, y, anchor: 'top-left', relative: false },
  size: { width: 60, height: 0, unit: 'mm' }, // height 0 for horizontal line
  style: {
    border_width: 1,
    border_color: '#000000',
    border_style: 'solid',
  },
  content:{
    direction: 'horizontal',
    start_x: 0,
    start_y: 0,
    end_x: 60,
    end_y: 0,
    stroke_color: '#000000',
    stroke_width: 1,
    stroke_style: 'solid',
  },
  locked: false,
  visible: true,
  z_index: 0,
});

export const createDefaultChartElement = (
  x: number,
  y: number,
  dataSource: string
): TemplateElement => ({
  id: generateElementId('chart'),
  type: 'chart',
  position: { x, y, anchor: 'top-left', relative: false },

  size: {
    width: 120,
    height: 70,
    unit: 'mm',
  },

  style: {
    border_width: 1,
    border_color: '#e5e7eb',
    border_style: 'solid',
    border_radius: 4,
    background_color: '#ffffff',
  },

  content: {
    chart_type: 'bar',

    data_source: dataSource,

    // Default empty fields — user must configure
    x_field: '',
    y_field: '',
    group_field: undefined,

    aggregation: 'count',

    colors: [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
    ],

    show_legend: true,
    show_labels: true,

    title: 'Chart Title',

    filters: [],
  } as ChartContent,

  locked: false,
  visible: true,
  z_index: 0,
});

