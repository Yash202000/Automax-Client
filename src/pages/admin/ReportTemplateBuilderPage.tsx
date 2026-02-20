import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Save,
  Eye,
  Download,
  Type,
  Image,
  Table,
  Square,
  Minus,
  Calendar,
  PieChart,
  Trash2,
  Copy,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  Plus,
  GripVertical,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import type {
  TemplateConfig,
  TemplateElement,
  PageSettings,
  HeaderConfig,
  FooterConfig,
  ElementType,
  TextContent,
  ImageContent,
  TableContent,
  DynamicFieldContent,
} from '../../types/reportTemplate';
import {
  DEFAULT_PAGE_SETTINGS,
  createDefaultTextElement,
  createDefaultImageElement,
  createDefaultTableElement,
  createDefaultDynamicFieldElement,
  generateElementId,
  createDefaultLineElement,
  createDefaultShapeElement,
  createDefaultChartElement,
} from '../../types/reportTemplate';
import {
  getTemplate,
  createTemplate,
  updateTemplate,
  previewTemplateInWindow,
  downloadReport,
} from '../../services/reportTemplateApi';
import { DATA_SOURCES } from '../../constants/reportFields';

// Element toolbox items
const ELEMENT_TOOLS = [
  { type: 'text' as ElementType, label: 'Text', icon: Type },
  { type: 'image' as ElementType, label: 'Image', icon: Image },
  { type: 'table' as ElementType, label: 'Table', icon: Table },
  { type: 'shape' as ElementType, label: 'Shape', icon: Square },
  { type: 'line' as ElementType, label: 'Line', icon: Minus },
  { type: 'dynamic_field' as ElementType, label: 'Dynamic Field', icon: Calendar },
  { type: 'chart' as ElementType, label: 'Chart', icon: PieChart },
];

const PAGE_SIZES = [
  { value: 'A4', label: 'A4 (210 x 297 mm)' },
  { value: 'Letter', label: 'Letter (216 x 279 mm)' },
  { value: 'Legal', label: 'Legal (216 x 356 mm)' },
  { value: 'A3', label: 'A3 (297 x 420 mm)' },
];

const ReportTemplateBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [templateName, setTemplateName] = useState('New Report Template');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [dataSource, setDataSource] = useState('incidents');

  const [pageSettings, setPageSettings] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS);
  const [header, setHeader] = useState<HeaderConfig>({
    enabled: true,
    height: 30,
    elements: [],
    show_on_all_pages: true,
  });
  const [footer, setFooter] = useState<FooterConfig>({
    enabled: true,
    height: 15,
    elements: [],
    show_page_number: true,
    page_number_format: 'Page {page}',
    show_on_all_pages: true,
  });
  const [elements, setElements] = useState<TemplateElement[]>([]);

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'elements' | 'page' | 'header' | 'footer' | 'properties'>('elements');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedHeaderElementId, setSelectedHeaderElementId] = useState<string | null>(null);


  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load template if editing
  useEffect(() => {
    if (id && id !== 'new') {
      loadTemplate(id);
    }
  }, [id]);

  const loadTemplate = async (templateId: string) => {
    setLoading(true);
    try {
      const template = await getTemplate(templateId);
      setTemplateName(template.name);
      setTemplateDescription(template.description);
      setIsPublic(template.is_public);
      setPageSettings(template.template.page_settings);
      if (template.template.header) setHeader(template.template.header);
      if (template.template.footer) setFooter(template.template.footer);
      setElements(template.template.elements);

      // Find data source from table element
      const tableElement = template.template.elements.find(e => e.type === 'table');
      if (tableElement) {
        const tableContent = tableElement.content as TableContent;
        setDataSource(tableContent.data_source);
      }
    } catch {
      setError('Failed to load template');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const getTemplateConfig = useCallback((): TemplateConfig => ({
    page_settings: pageSettings,
    header: header.enabled ? header : undefined,
    footer: footer.enabled ? footer : undefined,
    elements,
  }), [pageSettings, header, footer, elements]);

  const handleSave = async () => {
    if (!templateName.trim()) {
      setError('Template name is required');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setSaving(true);
    try {
      const templateConfig = getTemplateConfig();

      if (id && id !== 'new') {
        await updateTemplate(id, {
          name: templateName,
          description: templateDescription,
          template: templateConfig,
          is_public: isPublic,
        });
        setSuccessMessage('Template updated successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const newTemplate = await createTemplate({
          name: templateName,
          description: templateDescription,
          template: templateConfig,
          is_public: isPublic,
        });
        setSuccessMessage('Template created successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
        navigate(`/reports/templates/${newTemplate.id}/edit`, { replace: true });
      }
    } catch {
      setError('Failed to save template');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    try {
      const templateConfig = getTemplateConfig();
      await previewTemplateInWindow(templateConfig, dataSource, 20);
    } catch {
      setError('Failed to generate preview');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleExport = async () => {
    if (!id || id === 'new') {
      setError('Please save the template first');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      await downloadReport({
        template_id: id,
        data_source: dataSource,
        format: 'pdf',
        file_name: templateName,
      });
      setSuccessMessage('Report downloaded');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError('Failed to export report');
      setTimeout(() => setError(null), 3000);
    }
  };

  const addElement = (type: ElementType) => {
    let newElement: TemplateElement;
    const x = 10;
    const y = elements.length * 20 + 10;

    switch (type) {
      case 'text':
        newElement = createDefaultTextElement(x, y);
        break;
      case 'image':
        newElement = createDefaultImageElement(x, y);
        break;
      case 'table':
        newElement = createDefaultTableElement(x, y, dataSource);
        break;
      case 'dynamic_field':
        newElement = createDefaultDynamicFieldElement(x, y, 'date');
        break;
      case 'line':
        newElement = createDefaultLineElement(x, y);
        break;
      case 'shape':
        newElement = createDefaultShapeElement(x, y);
        break;
      case 'chart':
        newElement = createDefaultChartElement(x, y, dataSource);
        break;
      default:
        newElement = createDefaultTextElement(x, y);
    }

    setElements(prev => [...prev, newElement]);
    setSelectedElementId(newElement.id);
    setActiveTab('properties');
    setSelectedHeaderElementId(null);
  };

  const updateElement = (elementId: string, updates: Partial<TemplateElement>) => {
    setElements(prev => prev.map(el =>
      el.id === elementId ? { ...el, ...updates } : el
    ));
  };

  const updateElementContent = (elementId: string, content: TemplateElement['content']) => {
    setElements(prev => prev.map(el =>
      el.id === elementId ? { ...el, content } : el
    ));
  };

  const deleteElement = (elementId: string) => {
    setElements(prev => prev.filter(el => el.id !== elementId));
    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }
  };

  const duplicateElement = (elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (element) {
      const newElement: TemplateElement = {
        ...JSON.parse(JSON.stringify(element)),
        id: generateElementId(element.type),
        position: {
          ...element.position,
          x: element.position.x + 10,
          y: element.position.y + 10,
        },
      };
      setElements(prev => [...prev, newElement]);
      setSelectedElementId(newElement.id);
    }
  };

  const moveElement = (elementId: string, direction: 'up' | 'down') => {
    const index = elements.findIndex(el => el.id === elementId);
    if (index === -1) return;

    const newElements = [...elements];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= elements.length) return;

    [newElements[index], newElements[newIndex]] = [newElements[newIndex], newElements[index]];
    setElements(newElements);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent, elementId: string) => {
    if (elements.find(el => el.id === elementId)?.locked) return;

    setSelectedElementId(elementId);
    setIsDragging(true);

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElementId || !canvasRef.current) return;

    const element = elements.find(el => el.id === selectedElementId);
    if (element?.locked) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const scale = canvasRef.current.clientWidth / (pageSettings.size === 'A4' ? 210 : 216);

    const newX = (e.clientX - canvasRect.left - dragOffset.x) / scale;
    const newY = (e.clientY - canvasRect.top - dragOffset.y) / scale;

    updateElement(selectedElementId, {
      position: { ...element!.position, x: Math.max(0, newX), y: Math.max(0, newY) },
    });
  };

   const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  // header elements
  const updateHeaderElement = (elementId: string, updates: Partial<TemplateElement>) => {
  setHeader(prev => ({
    ...prev,
    elements: prev.elements.map(el =>
      el.id === elementId ? { ...el, ...updates } : el
    ),
  }));
};

const updateHeaderElementContent = (elementId: string, content: TemplateElement['content']) => {
  setHeader(prev => ({
    ...prev,
    elements: prev.elements.map(el =>
      el.id === elementId ? { ...el, content } : el
    ),
  }));
};

const deleteHeaderElement = (elementId: string) => {
  setHeader(prev => ({
    ...prev,
    elements: prev.elements.filter(el => el.id !== elementId),
  }));
  setSelectedHeaderElementId(null);
};

 

  const selectedElement = elements.find(el => el.id === selectedElementId);

  // Get available fields for data source
  const availableFields = DATA_SOURCES.find(ds => ds.key === dataSource)?.fields || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Notifications */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="bg-background border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/reports/templates')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="text-lg font-semibold border-none focus:ring-0 p-0 bg-transparent"
              placeholder="Template Name"
            />
            <input
              type="text"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              className="text-sm text-gray-500 dark:text-gray-300 border-none focus:ring-0 p-0 bg-transparent block w-full"
              placeholder="Add description..."
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dataSource}
            onChange={(e) => setDataSource(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm "
          >
            {DATA_SOURCES.map(ds => (
              <option className='text-black' key={ds.key} value={ds.key}>{ds.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded"
            />
            Public
          </label>
          <button
            onClick={handlePreview}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg dark:hover:bg-gray-700 hover:bg-gray-100"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg dark:hover:bg-gray-700 hover:bg-gray-100"
            disabled={!id || id === 'new'}
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-primary to-accent text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Toolbox */}
        <div className="w-64 bg-card border-r overflow-y-auto">
          {/* Tabs */}
          <div className="flex border-b">
            {(['elements', 'page', 'header', 'footer'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-3 py-2 text-xs font-medium capitalize ${
                  activeTab === tab
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500  hover:text-gray-700  dark:text-gray-300  dark:hover:text-gray-400'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === 'elements' && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Add Elements</h3>
                <div className="grid grid-cols-2 gap-2">
                  {ELEMENT_TOOLS.map(tool => (
                    <button
                      key={tool.type}
                      onClick={() => addElement(tool.type)}
                      className="flex flex-col items-center gap-1 p-3 border rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 hover:border-blue-300"
                    >
                      <tool.icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">{tool.label}</span>
                    </button>
                  ))}
                </div>

                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-6">Element List</h3>
                <div className="space-y-1">
                  {elements.map((element, index) => (
                    <div
                      key={element.id}
                      onClick={() => {
                        setSelectedElementId(element.id);
                        setActiveTab('properties');
                      }}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                        selectedElementId === element.id
                          ? 'bg-blue-50 dark:bg-white/5 border border-blue-200'
                          : 'hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      <span className="flex-1 text-sm truncate capitalize ">
                        {element.type === 'text' && (element.content as TextContent).text?.slice(0, 20)}
                        {element.type === 'table' && 'Data Table'}
                        {element.type === 'image' && 'Image'}
                        {element.type === 'dynamic_field' && (element.content as DynamicFieldContent).field}
                        {!['text', 'table', 'image', 'dynamic_field'].includes(element.type) && element.type}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); moveElement(element.id, 'up'); }}
                          disabled={index === 0}
                          className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveElement(element.id, 'down'); }}
                          disabled={index === elements.length - 1}
                          className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteElement(element.id); }}
                          className="p-1 hover:bg-red-100 rounded text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'page' && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Page Settings</h3>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Page Size</label>
                  <select
                    value={pageSettings.size}
                    onChange={(e) => setPageSettings(prev => ({ ...prev, size: e.target.value as PageSettings['size'] }))}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    {PAGE_SIZES.map(size => (
                      <option key={size.value} value={size.value}>{size.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Orientation</label>
                  <select
                    value={pageSettings.orientation}
                    onChange={(e) => setPageSettings(prev => ({ ...prev, orientation: e.target.value as 'portrait' | 'landscape' }))}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Top Margin (mm)</label>
                    <input
                      type="number"
                      value={pageSettings.margin_top}
                      onChange={(e) => setPageSettings(prev => ({ ...prev, margin_top: Number(e.target.value) }))}
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Bottom Margin (mm)</label>
                    <input
                      type="number"
                      value={pageSettings.margin_bottom}
                      onChange={(e) => setPageSettings(prev => ({ ...prev, margin_bottom: Number(e.target.value) }))}
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Left Margin (mm)</label>
                    <input
                      type="number"
                      value={pageSettings.margin_left}
                      onChange={(e) => setPageSettings(prev => ({ ...prev, margin_left: Number(e.target.value) }))}
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Right Margin (mm)</label>
                    <input
                      type="number"
                      value={pageSettings.margin_right}
                      onChange={(e) => setPageSettings(prev => ({ ...prev, margin_right: Number(e.target.value) }))}
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'header' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Header</h3>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={header.enabled}
                      onChange={(e) => setHeader(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-xs">Enabled</span>
                  </label>
                </div>
                {header.enabled && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Height (mm)</label>
                      <input
                        type="number"
                        value={header.height}
                        onChange={(e) => setHeader(prev => ({ ...prev, height: Number(e.target.value) }))}
                        className="w-full border rounded px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Background Color</label>
                      <input
                        type="color"
                        value={header.background || '#ffffff'}
                        onChange={(e) => setHeader(prev => ({ ...prev, background: e.target.value }))}
                        className="w-full h-8 border rounded"
                      />
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={header.show_on_all_pages}
                        onChange={(e) => setHeader(prev => ({ ...prev, show_on_all_pages: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-xs">Show on all pages</span>
                    </label>
                    <div className='space-y-2'>
                      <button
                      onClick={() => {
                        const titleElement = createDefaultTextElement(60, 10);
                        (titleElement.content as TextContent).text = templateName;
                        (titleElement.content as TextContent).font.size = 16;
                        (titleElement.content as TextContent).font.weight = 'bold';
                        setHeader(prev => ({
                          ...prev,
                          elements: [...prev.elements, titleElement],
                        }));
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                     Add Title
                    </button>
                    <button
                      onClick={() => {
                        const logoElement = createDefaultImageElement(5, 5);
                        setHeader(prev => ({
                          ...prev,
                          elements: [...prev.elements, logoElement],
                        }));
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Add Logo/Image
                    </button>
                    </div>
                    {header.elements.length > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="text-xs font-medium text-gray-600 mb-2">
                          Header Elements List
                        </h4>

                        <div className="space-y-1">
                          {header.elements.map((el) => (
                            <div
                              key={el.id}
                               onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedHeaderElementId(el.id);
                                  setSelectedElementId(null);
                                  setActiveTab('properties');
                                }}
                              className={`p-2 rounded cursor-pointer text-sm flex items-center justify-between ${
                                selectedHeaderElementId === el.id
                                  ? "bg-blue-50 border border-blue-200"
                                  : "hover:bg-gray-50 dark:hover:bg-gray-700"
                              }`}
                            >
                              {el.type === "text" &&
                                (el.content as TextContent).text?.slice(0, 25)}

                              {el.type === "image" && "Logo Image"}
                               <button
                                onClick={(e) => { e.stopPropagation(); deleteHeaderElement(el.id); }}
                                className="p-1 hover:bg-red-100 rounded text-red-500" >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'footer' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Footer</h3>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={footer.enabled}
                      onChange={(e) => setFooter(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-xs">Enabled</span>
                  </label>
                </div>
                {footer.enabled && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Height (mm)</label>
                      <input
                        type="number"
                        value={footer.height}
                        onChange={(e) => setFooter(prev => ({ ...prev, height: Number(e.target.value) }))}
                        className="w-full border rounded px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Background Color</label>
                      <input
                        type="color"
                        value={footer.background || '#ffffff'}
                        onChange={(e) => setFooter(prev => ({ ...prev, background: e.target.value }))}
                        className="w-full h-8 border rounded"
                      />
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={footer.show_page_number}
                        onChange={(e) => setFooter(prev => ({ ...prev, show_page_number: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-xs">Show page numbers</span>
                    </label>
                    {footer.show_page_number && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Page Number Format</label>
                        <input
                          type="text"
                          value={footer.page_number_format}
                          onChange={(e) => setFooter(prev => ({ ...prev, page_number_format: e.target.value }))}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                          placeholder="Page {page} of {total}"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

           {activeTab === 'properties' && (
                <>
                  {selectedElement && (
                    <ElementPropertiesPanel
                      element={selectedElement}
                      onUpdate={(updates) => updateElement(selectedElement.id, updates)}
                      onUpdateContent={(content) => updateElementContent(selectedElement.id, content)}
                      onDelete={() => deleteElement(selectedElement.id)}
                      onDuplicate={() => duplicateElement(selectedElement.id)}
                      availableFields={availableFields}
                    />
                  )}

                  {selectedHeaderElementId && (
                    <ElementPropertiesPanel
                      element={header.elements.find(el => el.id === selectedHeaderElementId)!}
                      onUpdate={(updates) => updateHeaderElement(selectedHeaderElementId, updates)}
                      onUpdateContent={(content) => updateHeaderElementContent(selectedHeaderElementId, content)}
                      onDelete={() => deleteHeaderElement(selectedHeaderElementId)}
                      onDuplicate={() => {}}
                      availableFields={availableFields}
                    />
                  )}
                </>
              )}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto p-8 bg-gray-200">
          <div
            ref={canvasRef}
            className="bg-white shadow-lg mx-auto relative"
            style={{
              width: pageSettings.orientation === 'portrait'
                ? (pageSettings.size === 'A4' ? '210mm' : '216mm')
                : (pageSettings.size === 'A4' ? '297mm' : '279mm'),
              minHeight: pageSettings.orientation === 'portrait'
                ? (pageSettings.size === 'A4' ? '297mm' : '279mm')
                : (pageSettings.size === 'A4' ? '210mm' : '216mm'),
            }}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            {/* Header Preview */}
            {header.enabled && (
              <div
                className="relative border-b border-dashed border-gray-300"
                style={{
                  height: `${header.height}mm`,
                  backgroundColor: header.background || 'transparent',
                  padding: `${pageSettings.margin_left}mm`,
                }}
              >
                <div className="text-xs text-gray-400 mb-1">Header Area</div>
                {header.elements.map(el => (
                <div
                  key={el.id}
                  className={`absolute ${
                    selectedHeaderElementId === el.id
                      ? 'ring-2 ring-blue-500'
                      : 'hover:ring-1 hover:ring-gray-300'
                  } ${el.locked ? 'opacity-75' : ''}`}
                  style={{
                    left: el.position.relative ? undefined : `${el.position.x}mm`,
                    top: el.position.relative ? undefined : `${el.position.y}mm`,
                    width: el.size.width > 0 ? `${el.size.width}mm` : 'auto',
                    height: el.size.auto_height ? 'auto' : `${el.size.height}mm`,
                    zIndex: el.z_index,
                    backgroundColor: el.style.background_color,
                    borderWidth: el.style.border_width,
                    borderColor: el.style.border_color,
                    borderStyle: el.style.border_style,
                    borderRadius: el.style.border_radius,
                    opacity: el.style.opacity ?? 1,
                    position: el.position.relative ? 'relative' : 'absolute',
                  }}
                  onClick={() => {
                    setSelectedHeaderElementId(el.id);
                    setActiveTab('properties');
                    setSelectedElementId(null);
                  }}
                >
                  {el.type === 'text' && (
                    <div
                      style={{
                        fontFamily: (el.content as TextContent).font.family,
                        fontSize: `${(el.content as TextContent).font.size}pt`,
                        fontWeight: (el.content as TextContent).font.weight,
                        fontStyle: (el.content as TextContent).font.style,
                        color: (el.content as TextContent).font.color,
                        textAlign: (el.content as TextContent).alignment,
                      }}
                    >
                      {(el.content as TextContent).text || 'Enter text...'}
                    </div>
                  )}

                  {el.type === 'image' && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300">
                      {(el.content as ImageContent).source ? (
                        <img
                          src={(el.content as ImageContent).source}
                          alt={(el.content as ImageContent).alt || ''}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <Image className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                  )}
                  </div>
                ))}
              </div>
            )}

            {/* Content Area */}
            <div
              className="relative"
              style={{
                padding: `${pageSettings.margin_top}mm ${pageSettings.margin_right}mm ${pageSettings.margin_bottom}mm ${pageSettings.margin_left}mm`,
                minHeight: '200mm',
              }}
            >
              {elements.map((element) => (
                <div
                  key={element.id}
                  className={`absolute cursor-move ${
                    selectedElementId === element.id
                      ? 'ring-2 ring-blue-500'
                      : 'hover:ring-1 hover:ring-gray-300'
                  } ${element.locked ? 'cursor-not-allowed opacity-75' : ''}`}
                  style={{
                    left: element.position.relative ? undefined : `${element.position.x}mm`,
                    top: element.position.relative ? undefined : `${element.position.y}mm`,
                    width: element.size.width > 0 ? `${element.size.width}mm` : 'auto',
                    height: element.size.auto_height ? 'auto' : `${element.size.height}mm`,
                    zIndex: element.z_index,
                    backgroundColor: element.style.background_color,
                    borderWidth: element.style.border_width,
                    borderColor: element.style.border_color,
                    borderStyle: element.style.border_style,
                    borderRadius: element.style.border_radius,
                    opacity: element.style.opacity ?? 1,
                    position: element.position.relative ? 'relative' : 'absolute',
                  }}
                  onMouseDown={(e) => handleCanvasMouseDown(e, element.id)}
                  onClick={() => {
                    setSelectedElementId(element.id);
                    setActiveTab('properties');
                    setSelectedHeaderElementId(null);
                  }}
                >
                  {element.type === 'text' && (
                    <div
                      style={{
                        fontFamily: (element.content as TextContent).font.family,
                        fontSize: `${(element.content as TextContent).font.size}pt`,
                        fontWeight: (element.content as TextContent).font.weight,
                        fontStyle: (element.content as TextContent).font.style,
                        color: (element.content as TextContent).font.color,
                        textAlign: (element.content as TextContent).alignment,
                      }}
                    >
                      {(element.content as TextContent).text || 'Enter text...'}
                    </div>
                  )}

                  {element.type === 'image' && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300">
                      {(element.content as ImageContent).source ? (
                        <img
                          src={(element.content as ImageContent).source}
                          alt={(element.content as ImageContent).alt || ''}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <Image className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                  )}

                  {element.type === 'table' && (
                    <div className="border rounded overflow-hidden">
                      <div className="bg-blue-500 text-white px-2 py-1 text-xs font-medium">
                        Data Table: {(element.content as TableContent).data_source}
                      </div>
                      <div className="p-2 text-xs text-gray-500">
                        {(element.content as TableContent).columns.length > 0
                          ? `${(element.content as TableContent).columns.length} columns configured`
                          : 'No columns configured - click to add'}
                      </div>
                    </div>
                  )}

                  {element.type === 'dynamic_field' && (
                    <div
                      className="bg-yellow-50 border border-yellow-200 px-2 py-1 rounded text-sm"
                      style={{
                        fontFamily: (element.content as DynamicFieldContent).font.family,
                        fontSize: `${(element.content as DynamicFieldContent).font.size}pt`,
                        color: (element.content as DynamicFieldContent).font.color,
                        textAlign: (element.content as DynamicFieldContent).alignment,
                      }}
                    >
                      {(element.content as DynamicFieldContent).prefix}
                      [{(element.content as DynamicFieldContent).field}]
                      {(element.content as DynamicFieldContent).suffix}
                    </div>
                  )}

                  {element.locked && (
                    <Lock className="absolute top-1 right-1 h-3 w-3 text-gray-400" />
                  )}
                </div>
              ))}

              {elements.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <Table className="h-12 w-12 mb-4" />
                  <p className="text-sm">Add elements from the toolbox</p>
                  <p className="text-xs mt-1">Start with a table to display your data</p>
                </div>
              )}
            </div>

            {/* Footer Preview */}
            {footer.enabled && (
              <div
                className="absolute bottom-0 left-0 right-0 border-t border-dashed border-gray-300"
                style={{
                  height: `${footer.height}mm`,
                  backgroundColor: footer.background || 'transparent',
                  padding: `0 ${pageSettings.margin_left}mm`,
                }}
              >
                <div className="flex items-center justify-between h-full text-xs text-gray-400">
                  <span>Footer Area</span>
                  {footer.show_page_number && (
                    <span>{footer.page_number_format.replace('{page}', '1').replace('{total}', '1')}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Element Properties Panel Component
interface ElementPropertiesPanelProps {
  element: TemplateElement;
  onUpdate: (updates: Partial<TemplateElement>) => void;
  onUpdateContent: (content: TemplateElement['content']) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  availableFields: Array<{ field: string; label: string; type: string }>;
}

const ElementPropertiesPanel: React.FC<ElementPropertiesPanelProps> = ({
  element,
  onUpdate,
  onUpdateContent,
  onDelete,
  onDuplicate,
  availableFields,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 capitalize">{element.type} Properties</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate({ locked: !element.locked })}
            className={`p-1.5 rounded ${element.locked ? 'bg-yellow-100 text-yellow-600' : 'hover:bg-gray-100'}`}
            title={element.locked ? 'Unlock' : 'Lock'}
          >
            {element.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </button>
          <button
            onClick={onDuplicate}
            className="p-1.5 hover:bg-gray-100 rounded"
            title="Duplicate"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-red-100 text-red-500 rounded"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">X Position (mm)</label>
          <input
            type="number"
            value={element.position.x}
            onChange={(e) => onUpdate({ position: { ...element.position, x: Number(e.target.value) } })}
            className="w-full border rounded px-2 py-1.5 text-sm"
            disabled={element.locked}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Y Position (mm)</label>
          <input
            type="number"
            value={element.position.y}
            onChange={(e) => onUpdate({ position: { ...element.position, y: Number(e.target.value) } })}
            className="w-full border rounded px-2 py-1.5 text-sm"
            disabled={element.locked}
          />
        </div>
      </div>

      {/* Size */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Width (mm)</label>
          <input
            type="number"
            value={element.size.width}
            onChange={(e) => onUpdate({ size: { ...element.size, width: Number(e.target.value) } })}
            className="w-full border rounded px-2 py-1.5 text-sm"
            disabled={element.locked}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Height (mm)</label>
          <input
            type="number"
            value={element.size.height}
            onChange={(e) => onUpdate({ size: { ...element.size, height: Number(e.target.value) } })}
            className="w-full border rounded px-2 py-1.5 text-sm"
            disabled={element.locked || element.size.auto_height}
          />
        </div>
      </div>

      {/* Type-specific properties */}
      {element.type === 'text' && (
        <TextElementProperties
          content={element.content as TextContent}
          onUpdate={onUpdateContent}
          disabled={element.locked}
        />
      )}

      {element.type === 'image' && (
        <ImageElementProperties
          content={element.content as ImageContent}
          onUpdate={onUpdateContent}
          disabled={element.locked}
        />
      )}

      {element.type === 'table' && (
        <TableElementProperties
          content={element.content as TableContent}
          onUpdate={onUpdateContent}
          availableFields={availableFields}
          disabled={element.locked}
        />
      )}

      {element.type === 'dynamic_field' && (
        <DynamicFieldProperties
          content={element.content as DynamicFieldContent}
          onUpdate={onUpdateContent}
          disabled={element.locked}
        />
      )}

      {/* Style Properties */}
      <div className="border-t pt-4">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Style</h4>
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Background Color</label>
            <input
              type="color"
              value={element.style.background_color || '#ffffff'}
              onChange={(e) => onUpdate({ style: { ...element.style, background_color: e.target.value } })}
              className="w-full h-8 border rounded"
              disabled={element.locked}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Border Width</label>
              <input
                type="number"
                value={element.style.border_width || 0}
                onChange={(e) => onUpdate({ style: { ...element.style, border_width: Number(e.target.value) } })}
                className="w-full border rounded px-2 py-1.5 text-sm"
                disabled={element.locked}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Border Color</label>
              <input
                type="color"
                value={element.style.border_color || '#000000'}
                onChange={(e) => onUpdate({ style: { ...element.style, border_color: e.target.value } })}
                className="w-full h-8 border rounded"
                disabled={element.locked}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Text Element Properties
const TextElementProperties: React.FC<{
  content: TextContent;
  onUpdate: (content: TextContent) => void;
  disabled: boolean;
}> = ({ content, onUpdate, disabled }) => (
  <div className="space-y-3">
    <div>
      <label className="block text-xs text-gray-500 mb-1">Text</label>
      <textarea
        value={content.text}
        onChange={(e) => onUpdate({ ...content, text: e.target.value })}
        className="w-full border rounded px-2 py-1.5 text-sm"
        rows={3}
        disabled={disabled}
      />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Font Size (pt)</label>
        <input
          type="number"
          value={content.font.size}
          onChange={(e) => onUpdate({ ...content, font: { ...content.font, size: Number(e.target.value) } })}
          className="w-full border rounded px-2 py-1.5 text-sm"
          disabled={disabled}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Font Weight</label>
        <select
          value={content.font.weight}
          onChange={(e) => onUpdate({ ...content, font: { ...content.font, weight: e.target.value as 'normal' | 'bold' } })}
          className="w-full border rounded px-2 py-1.5 text-sm"
          disabled={disabled}
        >
          <option value="normal">Normal</option>
          <option value="bold">Bold</option>
        </select>
      </div>
    </div>
    <div>
      <label className="block text-xs text-gray-500 mb-1">Text Color</label>
      <input
        type="color"
        value={content.font.color}
        onChange={(e) => onUpdate({ ...content, font: { ...content.font, color: e.target.value } })}
        className="w-full h-8 border rounded"
        disabled={disabled}
      />
    </div>
    <div>
      <label className="block text-xs text-gray-500 mb-1">Alignment</label>
      <select
        value={content.alignment}
        onChange={(e) => onUpdate({ ...content, alignment: e.target.value as TextContent['alignment'] })}
        className="w-full border rounded px-2 py-1.5 text-sm"
        disabled={disabled}
      >
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
        <option value="justify">Justify</option>
      </select>
    </div>
  </div>
);

// Image Element Properties
const ImageElementProperties: React.FC<{
  content: ImageContent;
  onUpdate: (content: ImageContent) => void;
  disabled: boolean;
}> = ({ content, onUpdate, disabled }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdate({
          ...content,
          source: event.target?.result as string,
          source_type: 'base64',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Image Source</label>
        <select
          value={content.source_type}
          onChange={(e) => onUpdate({ ...content, source_type: e.target.value as ImageContent['source_type'] })}
          className="w-full border rounded px-2 py-1.5 text-sm mb-2"
          disabled={disabled}
        >
          <option value="url">URL</option>
          <option value="base64">Upload File</option>
        </select>
        {content.source_type === 'url' ? (
          <input
            type="text"
            value={content.source}
            onChange={(e) => onUpdate({ ...content, source: e.target.value })}
            className="w-full border rounded px-2 py-1.5 text-sm"
            placeholder="https://example.com/image.png"
            disabled={disabled}
          />
        ) : (
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-sm"
            disabled={disabled}
          />
        )}
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Fit Mode</label>
        <select
          value={content.fit}
          onChange={(e) => onUpdate({ ...content, fit: e.target.value as ImageContent['fit'] })}
          className="w-full border rounded px-2 py-1.5 text-sm"
          disabled={disabled}
        >
          <option value="contain">Contain</option>
          <option value="cover">Cover</option>
          <option value="fill">Fill</option>
          <option value="none">None</option>
        </select>
      </div>
    </div>
  );
};

// Table Element Properties
const TableElementProperties: React.FC<{
  content: TableContent;
  onUpdate: (content: TableContent) => void;
  availableFields: Array<{ field: string; label: string; type: string }>;
  disabled: boolean;
}> = ({ content, onUpdate, availableFields, disabled }) => {
  const addColumn = (field: string) => {
    const fieldDef = availableFields.find(f => f.field === field);
    if (!fieldDef) return;

    const newColumn = {
      field: fieldDef.field,
      label: fieldDef.label,
      width: 0,
      width_unit: 'percent' as const,
      alignment: 'left' as const,
    };

    onUpdate({
      ...content,
      columns: [...content.columns, newColumn],
    });
  };

  const removeColumn = (index: number) => {
    const newColumns = [...content.columns];
    newColumns.splice(index, 1);
    onUpdate({ ...content, columns: newColumns });
  };

  const updateColumn = (index: number, updates: Partial<TableContent['columns'][0]>) => {
    const newColumns = [...content.columns];
    newColumns[index] = { ...newColumns[index], ...updates };
    onUpdate({ ...content, columns: newColumns });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Add Column</label>
        <select
          onChange={(e) => {
            if (e.target.value) {
              addColumn(e.target.value);
              e.target.value = '';
            }
          }}
          className="w-full border rounded px-2 py-1.5 text-sm"
          disabled={disabled}
        >
          <option value="">Select field...</option>
          {availableFields
            .filter(f => !content.columns.some(c => c.field === f.field))
            .map(field => (
              <option key={field.field} value={field.field}>{field.label}</option>
            ))}
        </select>
      </div>

      {content.columns.length > 0 && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Columns ({content.columns.length})</label>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {content.columns.map((col, index) => (
              <div key={col.field} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                <span className="flex-1 truncate">{col.label}</span>
                <select
                  value={col.alignment}
                  onChange={(e) => updateColumn(index, { alignment: e.target.value as 'left' | 'center' | 'right' })}
                  className="border rounded px-1 py-0.5 text-xs w-16"
                  disabled={disabled}
                >
                  <option value="left">L</option>
                  <option value="center">C</option>
                  <option value="right">R</option>
                </select>
                <button
                  onClick={() => removeColumn(index)}
                  className="p-1 hover:bg-red-100 text-red-500 rounded"
                  disabled={disabled}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={content.show_header}
            onChange={(e) => onUpdate({ ...content, show_header: e.target.checked })}
            className="rounded"
            disabled={disabled}
          />
          <span className="text-xs">Show header row</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={content.alternate_rows}
            onChange={(e) => onUpdate({ ...content, alternate_rows: e.target.checked })}
            className="rounded"
            disabled={disabled}
          />
          <span className="text-xs">Alternate row colors</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={content.show_row_numbers}
            onChange={(e) => onUpdate({ ...content, show_row_numbers: e.target.checked })}
            className="rounded"
            disabled={disabled}
          />
          <span className="text-xs">Show row numbers</span>
        </label>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Max Rows (0 = all)</label>
        <input
          type="number"
          value={content.max_rows || 0}
          onChange={(e) => onUpdate({ ...content, max_rows: Number(e.target.value) })}
          className="w-full border rounded px-2 py-1.5 text-sm"
          disabled={disabled}
          min={0}
        />
      </div>
    </div>
  );
};

// Dynamic Field Properties
const DynamicFieldProperties: React.FC<{
  content: DynamicFieldContent;
  onUpdate: (content: DynamicFieldContent) => void;
  disabled: boolean;
}> = ({ content, onUpdate, disabled }) => (
  <div className="space-y-3">
    <div>
      <label className="block text-xs text-gray-500 mb-1">Field Type</label>
      <select
        value={content.field}
        onChange={(e) => onUpdate({ ...content, field: e.target.value as DynamicFieldContent['field'] })}
        className="w-full border rounded px-2 py-1.5 text-sm"
        disabled={disabled}
      >
        <option value="date">Current Date</option>
        <option value="datetime">Current Date & Time</option>
        <option value="page_number">Page Number</option>
        <option value="total_pages">Total Pages</option>
        <option value="custom">Custom Text</option>
      </select>
    </div>
    {content.field === 'date' || content.field === 'datetime' ? (
      <div>
        <label className="block text-xs text-gray-500 mb-1">Date Format</label>
        <input
          type="text"
          value={content.format || ''}
          onChange={(e) => onUpdate({ ...content, format: e.target.value })}
          className="w-full border rounded px-2 py-1.5 text-sm"
          placeholder="2006-01-02 or DD/MM/YYYY"
          disabled={disabled}
        />
      </div>
    ) : null}
    {content.field === 'custom' && (
      <div>
        <label className="block text-xs text-gray-500 mb-1">Custom Value</label>
        <input
          type="text"
          value={content.custom_value || ''}
          onChange={(e) => onUpdate({ ...content, custom_value: e.target.value })}
          className="w-full border rounded px-2 py-1.5 text-sm"
          disabled={disabled}
        />
      </div>
    )}
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Prefix</label>
        <input
          type="text"
          value={content.prefix || ''}
          onChange={(e) => onUpdate({ ...content, prefix: e.target.value })}
          className="w-full border rounded px-2 py-1.5 text-sm"
          disabled={disabled}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Suffix</label>
        <input
          type="text"
          value={content.suffix || ''}
          onChange={(e) => onUpdate({ ...content, suffix: e.target.value })}
          className="w-full border rounded px-2 py-1.5 text-sm"
          disabled={disabled}
        />
      </div>
    </div>
    <div>
      <label className="block text-xs text-gray-500 mb-1">Alignment</label>
      <select
        value={content.alignment}
        onChange={(e) => onUpdate({ ...content, alignment: e.target.value as DynamicFieldContent['alignment'] })}
        className="w-full border rounded px-2 py-1.5 text-sm"
        disabled={disabled}
      >
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
    </div>
  </div>
);

export default ReportTemplateBuilderPage;
