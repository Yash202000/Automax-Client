import React from 'react';
import {
  AlertCircle,
  FileText,
  Users,
  Building2,
  MapPin,
  GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportDataSource } from '../../types';

interface DataSourceSelectorProps {
  value: ReportDataSource | null;
  onChange: (source: ReportDataSource) => void;
}

const iconMap: Record<string, React.ElementType> = {
  AlertCircle,
  FileText,
  Users,
  Building2,
  MapPin,
  GitBranch,
};

const dataSources: { key: ReportDataSource; label: string; description: string; icon: string }[] = [
  { key: 'incidents', label: 'Incidents', description: 'Incident tracking data', icon: 'AlertCircle' },
  { key: 'action_logs', label: 'Action Logs', description: 'Audit trail & activity', icon: 'FileText' },
  { key: 'users', label: 'Users', description: 'User accounts', icon: 'Users' },
  { key: 'departments', label: 'Departments', description: 'Organization structure', icon: 'Building2' },
  { key: 'locations', label: 'Locations', description: 'Location hierarchy', icon: 'MapPin' },
  { key: 'workflows', label: 'Workflows', description: 'Workflow definitions', icon: 'GitBranch' },
];

export const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {dataSources.map((source) => {
        const Icon = iconMap[source.icon] || AlertCircle;
        const isSelected = value === source.key;

        return (
          <button
            key={source.key}
            type="button"
            onClick={() => onChange(source.key)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
              isSelected
                ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]"
                : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/0.5)]"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              isSelected
                ? "bg-[hsl(var(--primary))] text-white"
                : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
            )}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-center">
              <p className={cn(
                "text-sm font-medium",
                isSelected ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--foreground))]"
              )}>
                {source.label}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                {source.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default DataSourceSelector;
