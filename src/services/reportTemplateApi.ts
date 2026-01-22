import { apiClient as api } from '../api/client';
import type {
  ReportTemplate,
  ReportTemplateCreateRequest,
  ReportTemplateUpdateRequest,
  GenerateReportRequest,
  TemplateConfig,
} from '../types/reportTemplate';

export interface ListTemplatesParams {
  search?: string;
  is_public?: boolean;
  page?: number;
  limit?: number;
}

export interface ListTemplatesResponse {
  data: ReportTemplate[];
  total: number;
  page: number;
  limit: number;
}

// List all templates
export const listTemplates = async (params?: ListTemplatesParams): Promise<ListTemplatesResponse> => {
  const response = await api.get('/admin/report-templates', { params });
  return {
    data: response.data.data,
    total: response.data.total,
    page: response.data.page,
    limit: response.data.limit,
  };
};

// Get a single template by ID
export const getTemplate = async (id: string): Promise<ReportTemplate> => {
  const response = await api.get(`/admin/report-templates/${id}`);
  return response.data.data;
};

// Get the default template
export const getDefaultTemplate = async (): Promise<ReportTemplate | null> => {
  try {
    const response = await api.get('/admin/report-templates/default');
    return response.data.data;
  } catch {
    return null;
  }
};

// Create a new template
export const createTemplate = async (data: ReportTemplateCreateRequest): Promise<ReportTemplate> => {
  const response = await api.post('/admin/report-templates', data);
  return response.data.data;
};

// Update an existing template
export const updateTemplate = async (id: string, data: ReportTemplateUpdateRequest): Promise<ReportTemplate> => {
  const response = await api.put(`/admin/report-templates/${id}`, data);
  return response.data.data;
};

// Delete a template
export const deleteTemplate = async (id: string): Promise<void> => {
  await api.delete(`/admin/report-templates/${id}`);
};

// Duplicate a template
export const duplicateTemplate = async (id: string): Promise<ReportTemplate> => {
  const response = await api.post(`/admin/report-templates/${id}/duplicate`);
  return response.data.data;
};

// Set a template as default
export const setDefaultTemplate = async (id: string): Promise<void> => {
  await api.post(`/admin/report-templates/${id}/set-default`);
};

// Preview a template (returns PDF blob)
export const previewTemplate = async (
  template: TemplateConfig,
  dataSource: string,
  limit?: number
): Promise<Blob> => {
  const response = await api.post(
    '/admin/report-templates/preview',
    { template, data_source: dataSource, limit: limit || 10 },
    { responseType: 'blob' }
  );
  return response.data;
};

// Generate a report from a template
export const generateReport = async (request: GenerateReportRequest): Promise<Blob> => {
  const response = await api.post('/admin/report-templates/generate', request, {
    responseType: 'blob',
  });
  return response.data;
};

// Download generated report
export const downloadReport = async (
  request: GenerateReportRequest,
  fileName?: string
): Promise<void> => {
  const blob = await generateReport(request);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || request.file_name || `report.${request.format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Preview template in new window
export const previewTemplateInWindow = async (
  template: TemplateConfig,
  dataSource: string,
  limit?: number
): Promise<void> => {
  const blob = await previewTemplate(template, dataSource, limit);
  const url = window.URL.createObjectURL(blob);
  window.open(url, '_blank');
};

export default {
  listTemplates,
  getTemplate,
  getDefaultTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  setDefaultTemplate,
  previewTemplate,
  generateReport,
  downloadReport,
  previewTemplateInWindow,
};
