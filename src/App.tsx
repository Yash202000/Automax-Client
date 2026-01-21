import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout, AuthLayout, ProtectedRoute, AdminLayout, AdminProtectedRoute, IncidentLayout, RequestLayout, WorkflowLayout, ComplaintsLayout } from './components/layout';
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
  SMTPSettingsPage,
  ReportBuilderPage,
  ReportTemplatesPage,
  LookupsPage,
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
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/roles" element={<RolesPage />} />
              <Route path="/admin/permissions" element={<PermissionsPage />} />
              <Route path="/admin/departments" element={<DepartmentsPage />} />
              <Route path="/admin/departments/:id" element={<DepartmentDetailPage />} />
              <Route path="/admin/locations" element={<LocationsPage />} />
              <Route path="/admin/locations/map" element={<LocationMapPage />} />
              <Route path="/admin/classifications" element={<ClassificationsPage />} />
              <Route path="/admin/action-logs" element={<ActionLogsPage />} />
              <Route path="/admin/smtp-settings" element={<SMTPSettingsPage />} />
              <Route path="/admin/reports" element={<ReportTemplatesPage />} />
              <Route path="/admin/reports/builder" element={<ReportBuilderPage />} />
              <Route path="/admin/reports/builder/:templateId" element={<ReportBuilderPage />} />
              <Route path="/admin/lookups" element={<LookupsPage />} />
            </Route>
          </Route>

          {/* Workflow routes - separate layout */}
          <Route element={<AdminProtectedRoute />}>
            <Route element={<WorkflowLayout />}>
              <Route path="/workflows" element={<WorkflowsPage />} />
              <Route path="/workflows/:id" element={<WorkflowDesignerPage />} />
            </Route>
          </Route>

          {/* Incident routes - separate layout */}
          <Route element={<AdminProtectedRoute />}>
            <Route element={<IncidentLayout />}>
              <Route path="/incidents" element={<IncidentsPage />} />
              <Route path="/incidents/new" element={<IncidentCreatePage />} />
              <Route path="/incidents/my-assigned" element={<MyIncidentsPage type="assigned" />} />
              <Route path="/incidents/my-created" element={<MyIncidentsPage type="created" />} />
              <Route path="/incidents/:id" element={<IncidentDetailPage />} />
            </Route>
          </Route>

          {/* Request routes - dedicated layout */}
          <Route element={<AdminProtectedRoute />}>
            <Route element={<RequestLayout />}>
              <Route path="/requests" element={<RequestsPage />} />
              <Route path="/requests/my-assigned" element={<MyRequestsPage type="assigned" />} />
              <Route path="/requests/my-created" element={<MyRequestsPage type="created" />} />
              <Route path="/requests/:id" element={<RequestDetailPage />} />
            </Route>
          </Route>

          {/* Complaint routes - dedicated layout */}
          <Route element={<AdminProtectedRoute />}>
            <Route element={<ComplaintsLayout />}>
              <Route path="/complaints" element={<ComplaintsPage />} />
              <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
            </Route>
          </Route>

          {/* Clean URL redirects */}
          <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />

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
