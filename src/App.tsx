import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout, AuthLayout, ProtectedRoute, AdminLayout, AdminProtectedRoute, PermissionRoute, IncidentLayout, RequestLayout, WorkflowLayout, ComplaintsLayout, QueryLayout, CallCentreLayout } from './components/layout';
import { PERMISSIONS } from './constants/permissions';
import {
  LoginPage,
  RegisterPage,
  DashboardPage,
  ProfilePage,
  SettingsPage,
  AdminDashboard,
  UsersPage,
  RolesPage,
  PermissionsPage,
  DepartmentsPage,
  DepartmentDetailPage,
  LocationsPage,
  LocationMapPage,
  ClassificationsPage,
  ActionLogsPage,
  WorkflowsPage,
  WorkflowDesignerPage,
  IncidentsPage,
  IncidentCreatePage,
  IncidentDetailPage,
  MyIncidentsPage,
  RequestsPage,
  RequestDetailPage,
  MyRequestsPage,
  ComplaintsPage,
  ComplaintDetailPage,
  QueriesPage,
  QueryDetailPage,
  SMTPSettingsPage,
  ReportBuilderPage,
  ReportTemplatesPage,
  ReportTemplatesListPage,
  ReportTemplateBuilderPage,
  LookupsPage,
  CallCentrePage,
  CallHistory,
} from './pages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected routes */}
          <Route element={<MainLayout />}>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Admin routes */}
          <Route element={<AdminProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              {/* User management - requires users:view permission */}
              <Route element={<PermissionRoute requiredPermissions={[PERMISSIONS.USERS_VIEW]} />}>
                <Route path="/admin/users" element={<UsersPage />} />
              </Route>
              {/* Role management - requires roles:view permission */}
              <Route element={<PermissionRoute requiredPermissions={[PERMISSIONS.ROLES_VIEW]} />}>
                <Route path="/admin/roles" element={<RolesPage />} />
              </Route>
              {/* Permission management - requires permissions:view permission */}
              <Route element={<PermissionRoute requiredPermissions={[PERMISSIONS.PERMISSIONS_VIEW]} />}>
                <Route path="/admin/permissions" element={<PermissionsPage />} />
              </Route>
              {/* Department management - requires departments:view permission */}
              <Route element={<PermissionRoute requiredPermissions={[PERMISSIONS.DEPARTMENTS_VIEW]} />}>
                <Route path="/admin/departments" element={<DepartmentsPage />} />
                <Route path="/admin/departments/:id" element={<DepartmentDetailPage />} />
              </Route>
              {/* Location management - requires locations:view permission */}
              <Route element={<PermissionRoute requiredPermissions={[PERMISSIONS.LOCATIONS_VIEW]} />}>
                <Route path="/admin/locations" element={<LocationsPage />} />
                <Route path="/admin/locations/map" element={<LocationMapPage />} />
              </Route>
              {/* Classification management - requires classifications:view permission */}
              <Route element={<PermissionRoute requiredPermissions={[PERMISSIONS.CLASSIFICATIONS_VIEW]} />}>
                <Route path="/admin/classifications" element={<ClassificationsPage />} />
              </Route>
              {/* Action logs - requires action-logs:view permission */}
              <Route element={<PermissionRoute requiredPermissions={[PERMISSIONS.ACTION_LOGS_VIEW]} />}>
                <Route path="/admin/action-logs" element={<ActionLogsPage />} />
              </Route>
              {/* SMTP Settings - requires settings:view permission */}
              <Route element={<PermissionRoute requiredPermissions={[PERMISSIONS.SETTINGS_VIEW]} />}>
                <Route path="/admin/smtp-settings" element={<SMTPSettingsPage />} />
              </Route>
              {/* Reports - requires reports:view permission */}
              <Route element={<PermissionRoute requiredPermissions={[PERMISSIONS.REPORTS_VIEW]} />}>
                <Route path="/admin/reports" element={<ReportTemplatesPage />} />
                <Route path="/admin/reports/builder" element={<ReportBuilderPage />} />
                <Route path="/admin/reports/builder/:templateId" element={<ReportBuilderPage />} />
                {/* Report Template Builder */}
                <Route path="/admin/report-templates" element={<ReportTemplatesListPage />} />
                <Route path="/admin/report-templates/:id/edit" element={<ReportTemplateBuilderPage />} />
              </Route>
              {/* Lookups - requires lookups:view permission */}
              <Route element={<PermissionRoute requiredPermissions={[PERMISSIONS.LOOKUPS_VIEW]} />}>
                <Route path="/admin/lookups" element={<LookupsPage />} />
              </Route>
            </Route>
          </Route>

          {/* Workflow routes - separate layout */}
          <Route element={<AdminProtectedRoute />}>
            <Route element={<PermissionRoute requiredPermissions={[PERMISSIONS.WORKFLOWS_VIEW]} />}>
              <Route element={<WorkflowLayout />}>
                <Route path="/workflows" element={<WorkflowsPage />} />
                <Route path="/workflows/:id" element={<WorkflowDesignerPage />} />
              </Route>
            </Route>
          </Route>

          {/* Incident routes - separate layout */}
          <Route element={<AdminProtectedRoute />}>
            <Route element={<IncidentLayout />}>
              {/* Base route requires view permission, page handles redirect if no view_all */}
              <Route element={<PermissionRoute requiredPermissions={[PERMISSIONS.INCIDENTS_VIEW]} />}>
                <Route path="/incidents" element={<IncidentsPage />} />
                <Route path="/incidents/my-assigned" element={<MyIncidentsPage type="assigned" />} />
                <Route path="/incidents/my-created" element={<MyIncidentsPage type="created" />} />
                <Route path="/incidents/:id" element={<IncidentDetailPage />} />
              </Route>
              {/* Create incident - requires create permission */}
              <Route element={<PermissionRoute requiredPermissions={[PERMISSIONS.INCIDENTS_CREATE]} />}>
                <Route path="/incidents/new" element={<IncidentCreatePage />} />
              </Route>
            </Route>
          </Route>

          {/* Request routes - dedicated layout */}
          <Route element={<AdminProtectedRoute />}>
            <Route element={<RequestLayout />}>
              {/* Base route requires view permission, page handles redirect if no view_all */}
              <Route element={<PermissionRoute requiredPermissions={[PERMISSIONS.REQUESTS_VIEW]} />}>
                <Route path="/requests" element={<RequestsPage />} />
                <Route path="/requests/my-assigned" element={<MyRequestsPage type="assigned" />} />
                <Route path="/requests/my-created" element={<MyRequestsPage type="created" />} />
                <Route path="/requests/:id" element={<RequestDetailPage />} />
              </Route>
            </Route>
          </Route>

          {/* Complaint routes - dedicated layout */}
          <Route element={<AdminProtectedRoute />}>
            <Route element={<ComplaintsLayout />}>
              {/* Base route requires view permission, page handles redirect if no view_all */}
              <Route element={<PermissionRoute requiredPermissions={[PERMISSIONS.COMPLAINTS_VIEW]} />}>
                <Route path="/complaints" element={<ComplaintsPage />} />
                <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
              </Route>
            </Route>
          </Route>

          {/* Query routes - dedicated layout */}
          <Route element={<AdminProtectedRoute />}>
            <Route element={<QueryLayout />}>
              {/* Base route requires view permission, page handles redirect if no view_all */}
              <Route element={<PermissionRoute requiredPermissions={[PERMISSIONS.QUERIES_VIEW]} />}>
                <Route path="/queries" element={<QueriesPage />} />
                <Route path="/queries/:id" element={<QueryDetailPage />} />
              </Route>
            </Route>
          </Route>

          {/* Clean URL redirects */}
          <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />

          {/* Call Centre Management - dedicated layout */}
          <Route element={<AdminProtectedRoute />}>
            <Route element={<CallCentreLayout />}>
              <Route path="/call-centre" element={<Navigate to="/call-centre/contacts" replace />} />
              <Route path="/call-centre/contacts" element={<CallCentrePage />} />
              <Route path="/call-centre/history" element={<CallHistory />} />
              {/* <Route path="/queries/:id" element={<QueryDetailPage />} /> */}
            </Route>
          </Route>

          {/* Redirect root to dashboard or login */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
