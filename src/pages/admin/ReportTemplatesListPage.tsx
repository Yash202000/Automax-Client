import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Star,
  Download,
  FileText,
  AlertCircle,
  X,
  Calendar,
  Filter,
} from 'lucide-react';
import {
  listTemplates,
  deleteTemplate,
  duplicateTemplate,
  setDefaultTemplate,
  downloadReport,
} from '../../services/reportTemplateApi';
import type { ReportTemplate, GenerateReportRequest } from '../../types/reportTemplate';
import { Button } from '@/components/ui';

interface ExportFilters {
  date_from?: string;
  date_to?: string;
  status?: string;
  format: 'pdf' | 'xlsx';
}

const ReportTemplatesListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [exportFilters, setExportFilters] = useState<ExportFilters>({
    format: 'pdf',
  });
  const [exporting, setExporting] = useState(false);

  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['report-templates', page, search],
    queryFn: () => listTemplates({ search, page, limit }),
  });

  const templates = data?.data || [];
  const total = data?.total || 0;

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      setSuccessMessage('Template deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: () => {
      setError('Failed to delete template');
      setTimeout(() => setError(null), 3000);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      setSuccessMessage('Template duplicated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: () => {
      setError('Failed to duplicate template');
      setTimeout(() => setError(null), 3000);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: setDefaultTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      setSuccessMessage('Default template updated');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: () => {
      setError('Failed to set default template');
      setTimeout(() => setError(null), 3000);
    },
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    deleteMutation.mutate(id);
    setOpenMenuId(null);
  };

  const handleDuplicate = async (id: string) => {
    duplicateMutation.mutate(id);
    setOpenMenuId(null);
  };

  const handleSetDefault = async (id: string) => {
    setDefaultMutation.mutate(id);
    setOpenMenuId(null);
  };

  const openExportModal = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setExportFilters({ format: 'pdf' });
    setShowExportModal(true);
    setOpenMenuId(null);
  };

  const handleExportWithFilters = async () => {
    if (!selectedTemplate) return;

    setExporting(true);
    try {
      const tableElement = selectedTemplate.template.elements.find(e => e.type === 'table');
      const dataSource = tableElement
        ? (tableElement.content as { data_source: string }).data_source
        : 'incidents';

      // Build filters array
      const filters: Array<{ field: string; operator: string; value: unknown }> = [];

      if (exportFilters.date_from) {
        filters.push({ field: 'created_at', operator: '>=', value: exportFilters.date_from });
      }
      if (exportFilters.date_to) {
        filters.push({ field: 'created_at', operator: '<=', value: exportFilters.date_to });
      }
      if (exportFilters.status) {
        filters.push({ field: 'status', operator: '=', value: exportFilters.status });
      }

      const request: GenerateReportRequest = {
        template_id: selectedTemplate.id,
        data_source: dataSource,
        format: exportFilters.format,
        file_name: selectedTemplate.name,
        filters: filters.length > 0 ? filters : undefined,
      };

      await downloadReport(request);
      setSuccessMessage('Report downloaded successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowExportModal(false);
      setSelectedTemplate(null);
    } catch {
      setError('Failed to export report');
      setTimeout(() => setError(null), 3000);
    } finally {
      setExporting(false);
    }
  };

  const handleQuickExport = async (template: ReportTemplate) => {
    try {
      const tableElement = template.template.elements.find(e => e.type === 'table');
      const dataSource = tableElement
        ? (tableElement.content as { data_source: string }).data_source
        : 'incidents';

      await downloadReport({
        template_id: template.id,
        data_source: dataSource,
        format: 'pdf',
        file_name: template.name,
      });
      setSuccessMessage('Report downloaded');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError('Failed to export report');
      setTimeout(() => setError(null), 3000);
    }
    setOpenMenuId(null);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      {/* Notifications */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Report Templates</h1>
          <p className="text-gray-500 mt-1">Create and manage customizable report templates</p>
        </div>
        <Button
          onClick={() => navigate('/reports/templates/new/edit')}
          className="flex items-center gap-2 px-4 py-2"
        >
          <Plus className="h-5 w-5" />
          New Template
        </Button>
      </div>

      {/* Search */}
      <div className="bg-card rounded-lg shadow mb-6">
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Template List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No templates found</p>
            <p className="text-sm mt-1">Create your first report template to get started</p>
            <button
              onClick={() => navigate('/reports/templates/new/edit')}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Create Template
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{template.name}</h3>
                      {template.is_default && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          Default
                        </span>
                      )}
                      {template.is_public && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          Public
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {template.description || 'No description'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Created by {template.created_by?.username || 'Unknown'} on{' '}
                      {new Date(template.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/reports/templates/${template.id}/edit`)}
                    className="p-2 hover:bg-gray-200 rounded-lg"
                    title="Edit"
                  >
                    <Edit className="h-5 w-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => openExportModal(template)}
                    className="p-2 hover:bg-gray-200 rounded-lg"
                    title="Export with filters"
                  >
                    <Download className="h-5 w-5 text-gray-600" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === template.id ? null : template.id)}
                      className="p-2 hover:bg-gray-200 rounded-lg"
                    >
                      <MoreVertical className="h-5 w-5 text-gray-600" />
                    </button>
                    {openMenuId === template.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-20">
                          <button
                            onClick={() => navigate(`/reports/templates/${template.id}/edit`)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDuplicate(template.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Copy className="h-4 w-4" />
                            Duplicate
                          </button>
                          {!template.is_default && (
                            <button
                              onClick={() => handleSetDefault(template.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Star className="h-4 w-4" />
                              Set as Default
                            </button>
                          )}
                          <button
                            onClick={() => openExportModal(template)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Filter className="h-4 w-4" />
                            Export with Filters
                          </button>
                          <button
                            onClick={() => handleQuickExport(template)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Download className="h-4 w-4" />
                            Quick Export PDF
                          </button>
                          <hr className="my-1" />
                          <button
                            onClick={() => handleDelete(template.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} templates
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowExportModal(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Export Report</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Template Info */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Template</p>
                <p className="font-medium">{selectedTemplate.name}</p>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    From Date
                  </label>
                  <input
                    type="date"
                    value={exportFilters.date_from || ''}
                    onChange={(e) => setExportFilters(prev => ({ ...prev, date_from: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    To Date
                  </label>
                  <input
                    type="date"
                    value={exportFilters.date_to || ''}
                    onChange={(e) => setExportFilters(prev => ({ ...prev, date_to: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status (optional)
                </label>
                <select
                  value={exportFilters.status || ''}
                  onChange={(e) => setExportFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {/* Export Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Export Format
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      value="pdf"
                      checked={exportFilters.format === 'pdf'}
                      onChange={() => setExportFilters(prev => ({ ...prev, format: 'pdf' }))}
                      className="text-blue-600"
                    />
                    <span className="text-sm">PDF</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      value="xlsx"
                      checked={exportFilters.format === 'xlsx'}
                      onChange={() => setExportFilters(prev => ({ ...prev, format: 'xlsx' }))}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Excel</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleExportWithFilters}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {exporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportTemplatesListPage;
