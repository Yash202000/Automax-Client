import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  Settings,
  AlertTriangle,
  GitBranch,
  FileBarChart,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  const navigationCards = [
    {
      title: 'Admin Panel',
      subtitle: 'User & Access Control',
      description: 'Users, roles, permissions, departments',
      href: '/admin',
      icon: Settings,
      gradient: 'from-violet-500 to-purple-600',
      shadowColor: 'shadow-violet-500/20',
    },
    {
      title: 'Incident Management',
      subtitle: 'Track & Resolve',
      description: 'Create, track, and manage incidents',
      href: '/incidents',
      icon: AlertTriangle,
      gradient: 'from-blue-500 to-cyan-500',
      shadowColor: 'shadow-blue-500/20',
    },
    {
      title: 'Workflow Management',
      subtitle: 'Design & Configure',
      description: 'Build workflows with states & transitions',
      href: '/workflows',
      icon: GitBranch,
      gradient: 'from-emerald-500 to-teal-500',
      shadowColor: 'shadow-emerald-500/20',
    },
    {
      title: 'Reports & Analytics',
      subtitle: 'Insights & Logs',
      description: 'View reports and audit logs',
      href: '/reports',
      icon: FileBarChart,
      gradient: 'from-orange-500 to-amber-500',
      shadowColor: 'shadow-orange-500/20',
    },
  ];

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col">
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
            Welcome back, {user?.first_name || user?.username}
          </h1>
        </div>
        <p className="text-[hsl(var(--muted-foreground))] ml-12">
          What would you like to work on today?
        </p>
      </div>

      {/* Navigation Cards Grid - 4 columns on large screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {navigationCards.map((card) => (
          <Link
            key={card.title}
            to={card.href}
            className={`
              group relative overflow-hidden rounded-2xl p-5
              bg-gradient-to-br ${card.gradient}
              shadow-lg ${card.shadowColor}
              hover:shadow-xl hover:scale-[1.02]
              transition-all duration-300 ease-out
              min-h-[160px] flex flex-col justify-between
            `}
          >
            {/* Background decoration */}
            <div className="absolute -top-4 -right-4 w-24 h-24 opacity-10">
              <card.icon className="w-full h-full" strokeWidth={0.5} />
            </div>

            {/* Content */}
            <div className="relative z-10">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl w-fit mb-3">
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-lg font-bold text-white leading-tight">{card.title}</h2>
              <p className="text-white/60 text-xs font-medium mt-0.5">{card.subtitle}</p>
            </div>

            {/* Arrow indicator */}
            <div className="relative z-10 flex items-center justify-between mt-3">
              <p className="text-white/70 text-xs hidden sm:block">{card.description}</p>
              <div className="p-1.5 bg-white/10 rounded-lg group-hover:bg-white/20 group-hover:translate-x-1 transition-all ml-auto">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Hover shine effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
            </div>
          </Link>
        ))}
      </div>

      {/* System Status Footer */}
      <div className="mt-auto pt-8 flex items-center justify-center gap-3 py-4">
        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-sm text-[hsl(var(--muted-foreground))]">
          All systems operational
        </span>
      </div>
    </div>
  );
};
