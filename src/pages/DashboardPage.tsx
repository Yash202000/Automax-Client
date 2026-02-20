import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../constants/permissions';
import { applicationLinkApi } from '../api/applicationLinks';
import {
  Settings,
  AlertTriangle,
  GitBranch,
  FileBarChart,
  ArrowRight,
  Sparkles,
  FileText,
  MessageSquareWarning,
  HelpCircle,
  PhoneCallIcon,
  ExternalLink
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface NavigationCard {
  title: string;
  subtitle: string;
  description: string;
  href: string;
  icon: React.ElementType;
  gradient: string;
  shadowColor: string;
  permissions: string[];
}

// Helper to get Lucide icon component by name
const getIconComponent = (iconName: string): React.ElementType => {
  const Icons = LucideIcons as any;
  return Icons[iconName] || ExternalLink;
};

// Helper to get gradient classes by color name
const getGradientClasses = (color: string) => {
  const gradients: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-500',
    violet: 'from-violet-500 to-purple-600',
    emerald: 'from-emerald-500 to-teal-600',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-pink-600',
    orange: 'from-orange-500 to-red-600',
  };
  return gradients[color] || 'from-blue-500 to-cyan-500';
};

const getShadowColor = (color: string) => {
  const shadows: Record<string, string> = {
    blue: 'shadow-blue-500/20',
    violet: 'shadow-violet-500/20',
    emerald: 'shadow-emerald-500/20',
    amber: 'shadow-amber-500/20',
    rose: 'shadow-rose-500/20',
    orange: 'shadow-orange-500/20',
  };
  return shadows[color] || 'shadow-blue-500/20';
};

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { hasAnyPermission, isSuperAdmin } = usePermissions();

  // Fetch active application links
  const { data: appLinksResponse } = useQuery({
    queryKey: ['application-links'],
    queryFn: () => applicationLinkApi.listActive(),
  });

  const applicationLinks = appLinksResponse?.data || [];

  const navigationCards: NavigationCard[] = [
    {
      title: t('dashboard.adminPanel'),
      subtitle: t('dashboard.userAccessControl'),
      description: t('dashboard.usersRolesPermissions'),
      href: '/admin',
      icon: Settings,
      gradient: 'from-[#A7B1BA] to-[#777E84]',
      shadowColor: 'shadow-violet-500/20',
      permissions: [PERMISSIONS.DASHBOARD_ADMIN],
    },
    {
      title: t('dashboard.incidentManagement'),
      subtitle: t('dashboard.trackResolve'),
      description: t('dashboard.createTrackManage'),
      href: '/incidents',
      icon: AlertTriangle,
      gradient: 'from-[#5997F8] to-[#2968CC]',
      shadowColor: 'shadow-blue-500/20',
      permissions: [PERMISSIONS.DASHBOARD_INCIDENTS],
    },
    {
      title: t('dashboard.requestManagement', 'Request Management'),
      subtitle: t('dashboard.serviceRequests', 'Service Requests'),
      description: t('dashboard.manageServiceRequests', 'Handle and track service requests'),
      href: '/requests',
      icon: FileText,
      gradient: 'from-[#73C54F] to-[#469822]',
      shadowColor: 'shadow-emerald-500/20',
      permissions: [PERMISSIONS.DASHBOARD_REQUESTS],
    },
    {
      title: t('dashboard.complaintManagement', 'Complaint Management'),
      subtitle: t('dashboard.citizenComplaints', 'Citizen Complaints'),
      description: t('dashboard.manageComplaints', 'Handle and resolve complaints'),
      href: '/complaints',
      icon: MessageSquareWarning,
      gradient: 'from-[#EF9D39] to-[#C17B26]',
      shadowColor: 'shadow-amber-600/20',
      permissions: [PERMISSIONS.DASHBOARD_COMPLAINTS],
    },
    {
      title: t('dashboard.queryManagement', 'Query Management'),
      subtitle: t('dashboard.citizenQueries', 'Citizen Queries'),
      description: t('dashboard.manageQueries', 'Handle and respond to queries'),
      href: '/queries',
      icon: HelpCircle,
      gradient: 'from-[#DC68B2] to-[#B13283]',
      shadowColor: 'shadow-violet-500/20',
      permissions: [PERMISSIONS.DASHBOARD_QUERIES],
    },
    {
      title: t('dashboard.workflowManagement'),
      subtitle: t('dashboard.designConfigure'),
      description: t('dashboard.buildWorkflows'),
      href: '/workflows',
      icon: GitBranch,
      gradient: 'from-[#5C39EF] to-[#3B22A2]',
      shadowColor: 'shadow-rose-500/20',
      permissions: [PERMISSIONS.DASHBOARD_WORKFLOWS],
    },
    {
      title: t('dashboard.reportsAnalytics'),
      subtitle: t('dashboard.insightsLogs'),
      description: t('dashboard.viewReportsLogs'),
      href: '/reports',
      icon: FileBarChart,
      gradient: 'from-[#5ABEAA] to-[#25A78E]',
      shadowColor: 'shadow-orange-600/20',
      permissions: [PERMISSIONS.REPORTS_VIEW],
    },
    {
      title: t('dashboard.callCentreManagement'),
      subtitle: t('dashboard.callCentre'),
      description: t('dashboard.viewCall'),
      href: '/call-centre',
      icon: PhoneCallIcon,
      gradient: 'from-[#EF5C39] to-[#9D3A22]',
      shadowColor: 'shadow-orange-500/20',
      permissions: [],
    }
  ];

  // Filter cards based on user permissions
  const visibleCards = navigationCards.filter(
    (card) => isSuperAdmin || !card.permissions || card.permissions.length === 0 || hasAnyPermission(card.permissions)
  );

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col">
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-linear-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
            {t('dashboard.welcome')}, {user?.first_name || user?.username}
          </h1>
        </div>
        <p className="text-[hsl(var(--muted-foreground))] ml-12">
          {t('dashboard.whatToWorkOn')}
        </p>
      </div>

      {/* Navigation Cards Grid - 4 columns on large screens */}
      {(visibleCards.length > 0 || applicationLinks.length > 0) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Internal navigation cards */}
          {visibleCards.map((card) => (
            <Link
              key={card.title}
              to={card.href}
              className={`
                group relative overflow-hidden rounded-2xl p-5
                bg-linear-to-b ${card.gradient}
                shadow-lg 
                hover:shadow-xl hover:scale-[1.02]
                transition-all duration-300 ease-out
                min-h-[160px] flex flex-col justify-between
              `}
            >
              {/* Background decoration */}
              <div className="absolute -top-4 -end-4 w-24 h-24 opacity-10">
                <card.icon className="w-full h-full" strokeWidth={0.5} />
              </div>

              {/* Content */}
              <div className="relative z-10">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl w-fit mb-3">
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-lg font-bold text-white leading-tight">{card.title}</h2>
                <p className="text-white/90 text-xs font-medium mt-0.5">{card.subtitle}</p>
              </div>

              {/* Arrow indicator */}
              <div className="relative z-10 flex items-center justify-between mt-3">
                <p className="text-white/90 text-xs hidden sm:block">{card.description}</p>
                <div className="p-1.5 bg-white/10 rounded-lg group-hover:bg-white/20 group-hover:rtl:-translate-x-1 group-hover:ltr:translate-x-1 transition-all ms-auto">
                  <ArrowRight className="w-4 h-4 text-white rtl:-rotate-180" />
                </div>
              </div>

              {/* Hover shine effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              </div>
            </Link>
          ))}

          {/* Application link cards - open in new tab */}
          {applicationLinks.map((appLink) => {
            const AppIcon = getIconComponent(appLink.icon);
            const gradient = getGradientClasses(appLink.color);
            const shadowColor = getShadowColor(appLink.color);
            const hasImage = Boolean(appLink.image_url);

            return (
              <a
                key={appLink.id}
                href={appLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  group relative overflow-hidden rounded-2xl p-5
                  bg-linear-to-br ${gradient}
                  shadow-lg ${shadowColor}
                  hover:shadow-xl hover:scale-[1.02]
                  transition-all duration-300 ease-out
                  min-h-[160px] flex flex-col justify-between
                `}
              >
                {/* Background decoration */}
                <div className="absolute -top-4 -end-4 w-24 h-24 opacity-10">
                  {hasImage ? (
                    <img src={appLink.image_url} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <AppIcon className="w-full h-full" strokeWidth={0.5} />
                  )}
                </div>

                {/* External link indicator */}
                <div className="absolute top-3 right-3 p-1 bg-white/20 rounded-md">
                  <ExternalLink className="w-3 h-3 text-white" />
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl w-fit mb-3">
                    {hasImage ? (
                      <img src={appLink.image_url} alt={appLink.name} className="w-6 h-6 object-contain" />
                    ) : (
                      <AppIcon className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-white leading-tight">{appLink.name}</h2>
                  {appLink.description && (
                    <p className="text-white/90 text-xs font-medium mt-0.5 line-clamp-1">{appLink.description}</p>
                  )}
                </div>

                {/* Arrow indicator */}
                <div className="relative z-10 flex items-center justify-end mt-3">
                  <div className="p-1.5 bg-white/10 rounded-lg group-hover:bg-white/20 group-hover:translate-x-1 transition-all ml-auto">
                    <ArrowRight className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Hover shine effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="p-4 bg-[hsl(var(--muted))] rounded-full w-fit mx-auto mb-4">
              <Settings className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
            </div>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
              {t('dashboard.noAccessTitle', 'No modules available')}
            </h3>
            <p className="text-[hsl(var(--muted-foreground))]">
              {t('dashboard.noAccessDescription', 'Contact your administrator to get access to modules.')}
            </p>
          </div>
        </div>
      )}

      {/* System Status Footer */}
      <div className="mt-auto pt-8 flex items-center justify-center gap-3 py-4">
        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-sm text-[hsl(var(--muted-foreground))]">
          {t('dashboard.allSystemsOperational')}
        </span>
      </div>
    </div>
  );
};
