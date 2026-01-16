import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Shield,
  Building2,
  MapPin,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Clock,
  Sparkles,
  ArrowRight,
  Zap,
  AlertTriangle,
  GitBranch,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { userApi, roleApi, departmentApi, incidentApi, workflowApi } from '../../api/admin';

interface StatCardProps {
  title: string;
  icon: React.ElementType;
  gradient: string;
  count: number;
  isLoading: boolean;
  href: string;
  change?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  icon: Icon,
  gradient,
  count,
  isLoading,
  href,
  change,
}) => (
  <Link to={href} className="group block">
    <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 p-6 hover:shadow-xl hover:shadow-slate-200/50 hover:border-slate-300/60 transition-all duration-300">
      {/* Background gradient decoration */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full ${gradient} opacity-10 group-hover:opacity-20 group-hover:scale-125 transition-all duration-500`} />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl ${gradient} flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>

        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          {isLoading ? (
            <div className="h-9 w-20 bg-slate-200 animate-pulse rounded-lg" />
          ) : (
            <p className="text-3xl font-bold text-slate-800">{count.toLocaleString()}</p>
          )}
        </div>

        {change && (
          <div className="mt-3 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-600">{change}</span>
            <span className="text-sm text-slate-400">vs last month</span>
          </div>
        )}
      </div>
    </div>
  </Link>
);

export const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => userApi.list(1, 1),
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: roleApi.list,
  });

  const { data: departmentsData, isLoading: departmentsLoading } = useQuery({
    queryKey: ['admin', 'departments'],
    queryFn: departmentApi.list,
  });

  const { data: incidentStatsData, isLoading: incidentStatsLoading } = useQuery({
    queryKey: ['incidents', 'stats'],
    queryFn: incidentApi.getStats,
  });

  const { data: workflowsData, isLoading: workflowsLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowApi.list(),
  });

  const stats: StatCardProps[] = [
    {
      title: 'Open Incidents',
      icon: AlertTriangle,
      gradient: 'bg-gradient-to-br from-red-500 to-orange-600',
      count: (incidentStatsData?.data?.open ?? 0) + (incidentStatsData?.data?.in_progress ?? 0),
      isLoading: incidentStatsLoading,
      href: '/incidents',
    },
    {
      title: 'Total Incidents',
      icon: AlertTriangle,
      gradient: 'bg-gradient-to-br from-amber-500 to-yellow-600',
      count: incidentStatsData?.data?.total ?? 0,
      isLoading: incidentStatsLoading,
      href: '/incidents',
    },
    {
      title: 'Workflows',
      icon: GitBranch,
      gradient: 'bg-gradient-to-br from-cyan-500 to-teal-600',
      count: workflowsData?.data?.length ?? 0,
      isLoading: workflowsLoading,
      href: '/workflows',
    },
    {
      title: 'Total Users',
      icon: Users,
      gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
      count: usersData?.total_items ?? 0,
      isLoading: usersLoading,
      href: '/admin/users',
    },
    {
      title: 'Active Roles',
      icon: Shield,
      gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      count: rolesData?.data?.length ?? 0,
      isLoading: rolesLoading,
      href: '/admin/roles',
    },
    {
      title: 'Departments',
      icon: Building2,
      gradient: 'bg-gradient-to-br from-purple-500 to-violet-600',
      count: departmentsData?.data?.length ?? 0,
      isLoading: departmentsLoading,
      href: '/admin/departments',
    },
  ];

  const quickActions = [
    {
      title: 'View Incidents',
      description: 'Manage incident reports',
      icon: AlertTriangle,
      href: '/incidents',
      color: 'text-red-600',
      bg: 'bg-red-50 hover:bg-red-100',
    },
    {
      title: 'Manage Workflows',
      description: 'Configure workflows',
      icon: GitBranch,
      href: '/workflows',
      color: 'text-cyan-600',
      bg: 'bg-cyan-50 hover:bg-cyan-100',
    },
    {
      title: 'Manage Users',
      description: 'User accounts',
      icon: Users,
      href: '/admin/users',
      color: 'text-blue-600',
      bg: 'bg-blue-50 hover:bg-blue-100',
    },
    {
      title: 'Manage Roles',
      description: 'Configure permissions',
      icon: Shield,
      href: '/admin/roles',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 hover:bg-emerald-100',
    },
  ];

  const recentActivity = [
    { action: 'New user registered', target: 'john.doe@example.com', time: '2 min ago', type: 'user' },
    { action: 'Role permissions updated', target: 'Content Manager', time: '15 min ago', type: 'role' },
    { action: 'Department created', target: 'Engineering', time: '1 hour ago', type: 'department' },
    { action: 'User deactivated', target: 'jane.smith@example.com', time: '3 hours ago', type: 'user' },
    { action: 'New location added', target: 'San Francisco Office', time: '5 hours ago', type: 'location' },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return <Users className="w-4 h-4" />;
      case 'role': return <Shield className="w-4 h-4" />;
      case 'department': return <Building2 className="w-4 h-4" />;
      case 'location': return <MapPin className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user': return 'bg-blue-100 text-blue-600';
      case 'role': return 'bg-emerald-100 text-emerald-600';
      case 'department': return 'bg-purple-100 text-purple-600';
      case 'location': return 'bg-rose-100 text-rose-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 text-white">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-slate-200">Admin Dashboard</span>
              </div>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">
              Welcome back, {user?.first_name || user?.username}
            </h1>
            <p className="text-slate-400 text-lg max-w-xl">
              Here's what's happening with your organization today. Manage users, roles, and system settings all in one place.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl backdrop-blur-sm">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-emerald-300">All Systems Operational</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Overview</h2>
            <p className="text-slate-500 text-sm">Quick look at your system metrics</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Quick Actions</h3>
                <p className="text-sm text-slate-500">Common tasks</p>
              </div>
              <Zap className="w-5 h-5 text-amber-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.title}
                  to={action.href}
                  className={`group p-4 rounded-xl ${action.bg} transition-all duration-200`}
                >
                  <action.icon className={`w-6 h-6 ${action.color} mb-3`} />
                  <p className="font-semibold text-slate-800 text-sm">{action.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{action.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Recent Activity</h3>
                <p className="text-sm text-slate-500">Latest system events</p>
              </div>
              <button className="text-sm font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1 transition-colors">
                View all
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                      {activity.action}
                    </p>
                    <p className="text-sm text-slate-500 truncate">{activity.target}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">System Health</h3>
            <p className="text-sm text-slate-500">Infrastructure status</p>
          </div>
          <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            All healthy
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Database', status: 'Connected', latency: '12ms', color: 'emerald' },
            { name: 'Storage', status: '2.4TB free', latency: '8ms', color: 'emerald' },
            { name: 'Cache', status: 'Redis active', latency: '3ms', color: 'emerald' },
            { name: 'API Server', status: 'Operational', latency: '45ms', color: 'emerald' },
          ].map((service) => (
            <div key={service.name} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2.5 h-2.5 bg-${service.color}-500 rounded-full`} />
                <span className="text-sm font-semibold text-slate-700">{service.name}</span>
              </div>
              <p className="text-lg font-bold text-slate-900">{service.status}</p>
              <p className="text-xs text-slate-400 mt-1">Latency: {service.latency}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
