import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";
import {
  MainLayout,
  AuthLayout,
  ProtectedRoute,
  AdminLayout,
  AdminProtectedRoute,
  PermissionRoute,
  IncidentLayout,
  RequestLayout,
  WorkflowLayout,
  ComplaintsLayout,
  QueryLayout,
  CallCentreLayout,
  ReportsLayout,
  GoalLayout,
} from "./components/layout";
import { PERMISSIONS } from "./constants/permissions";
import { SettingsProvider } from "./contexts/SettingsContext";
// Eager: shell + auth + first-paint pages (load on every visit)
import {
  LoginPage,
  RegisterPage,
  DashboardPage,
  ProfilePage,
  SettingsPage,
  SSOCompletePage,
} from "./pages";
import { CitizenAuthLayout } from "./components/layout/CitizenAuthLayout";
import { CitizenLayout } from "./components/layout/CitizenLayout";
import { CitizenVerifyPage } from "./pages/CitizenverifyPage";
import { CitizenIncidentUpdatePage } from "./pages/CitizenIncidentUpdatePage";
import { UserBootstrap } from "./components/common/UserBootstrap";
import { ForgotPasswordPage } from "./pages/ForgetPasswordPage";

// Lazy: admin/feature pages — only fetched when navigated to.
// We import each page from its own file (NOT the barrel) so Rollup can emit a
// per-page chunk. Pages that re-export with `export const Foo` need the
// `.then(m => ({ default: m.Foo }))` re-wrap; pages with `export default`
// can be imported directly.
const AdminDashboard = lazy(() =>
  import("./pages/admin/AdminDashboard").then((m) => ({
    default: m.AdminDashboard,
  })),
);
const UsersPage = lazy(() =>
  import("./pages/admin/UsersPage").then((m) => ({ default: m.UsersPage })),
);
const RolesPage = lazy(() =>
  import("./pages/admin/RolesPage").then((m) => ({ default: m.RolesPage })),
);
const RoleCreatePage = lazy(() =>
  import("./pages/admin/RoleCreatePage").then((m) => ({
    default: m.RoleCreatePage,
  })),
);
const RoleEditPage = lazy(() =>
  import("./pages/admin/RoleEditPage").then((m) => ({
    default: m.RoleEditPage,
  })),
);
const PermissionsPage = lazy(() =>
  import("./pages/admin/PermissionsPage").then((m) => ({
    default: m.PermissionsPage,
  })),
);
const DepartmentsPage = lazy(() =>
  import("./pages/admin/DepartmentsPage").then((m) => ({
    default: m.DepartmentsPage,
  })),
);
const DepartmentDetailPage = lazy(() =>
  import("./pages/admin/DepartmentDetailPage").then((m) => ({
    default: m.DepartmentDetailPage,
  })),
);
const LocationsPage = lazy(() =>
  import("./pages/admin/LocationsPage").then((m) => ({
    default: m.LocationsPage,
  })),
);
const LocationMapPage = lazy(() => import("./pages/admin/LocationMapPage"));
const ClassificationsPage = lazy(() =>
  import("./pages/admin/ClassificationsPage").then((m) => ({
    default: m.ClassificationsPage,
  })),
);
const CategoriesPage = lazy(() => import("./pages/admin/CategoriesPage"));
const ActionLogsPage = lazy(() =>
  import("./pages/admin/ActionLogsPage").then((m) => ({
    default: m.ActionLogsPage,
  })),
);
const WorkflowsPage = lazy(() =>
  import("./pages/admin/WorkflowsPage").then((m) => ({
    default: m.WorkflowsPage,
  })),
);
const WorkflowDesignerPage = lazy(() =>
  import("./pages/admin/WorkflowDesignerPage").then((m) => ({
    default: m.WorkflowDesignerPage,
  })),
);
const IncidentsPage = lazy(() =>
  import("./pages/admin/IncidentsPage").then((m) => ({
    default: m.IncidentsPage,
  })),
);
const IncidentCreatePage = lazy(() =>
  import("./pages/admin/IncidentCreatePage").then((m) => ({
    default: m.IncidentCreatePage,
  })),
);
const IncidentEditPage = lazy(() =>
  import("./pages/admin/IncidentEditPage").then((m) => ({
    default: m.IncidentEditPage,
  })),
);
const IncidentDetailPage = lazy(() =>
  import("./pages/admin/IncidentDetailPage").then((m) => ({
    default: m.IncidentDetailPage,
  })),
);
const MyIncidentsPage = lazy(() =>
  import("./pages/admin/MyIncidentsPage").then((m) => ({
    default: m.MyIncidentsPage,
  })),
);
const RequestsPage = lazy(() =>
  import("./pages/admin/RequestsPage").then((m) => ({
    default: m.RequestsPage,
  })),
);
const RequestDetailPage = lazy(() =>
  import("./pages/admin/RequestDetailPage").then((m) => ({
    default: m.RequestDetailPage,
  })),
);
const MyRequestsPage = lazy(() =>
  import("./pages/admin/MyRequestsPage").then((m) => ({
    default: m.MyRequestsPage,
  })),
);
const ComplaintsPage = lazy(() =>
  import("./pages/admin/ComplaintsPage").then((m) => ({
    default: m.ComplaintsPage,
  })),
);
const ComplaintDetailPage = lazy(() =>
  import("./pages/admin/ComplaintDetailPage").then((m) => ({
    default: m.ComplaintDetailPage,
  })),
);
const QueriesPage = lazy(() =>
  import("./pages/admin/QueriesPage").then((m) => ({
    default: m.QueriesPage,
  })),
);
const QueryDetailPage = lazy(() =>
  import("./pages/admin/QueryDetailPage").then((m) => ({
    default: m.QueryDetailPage,
  })),
);
const ReportBuilderPage = lazy(() => import("./pages/admin/ReportBuilderPage"));
const ReportTemplatesPage = lazy(
  () => import("./pages/admin/ReportTemplatesPage"),
);
const ReportTemplatesListPage = lazy(
  () => import("./pages/admin/ReportTemplatesListPage"),
);
const ReportTemplateBuilderPage = lazy(
  () => import("./pages/admin/ReportTemplateBuilderPage"),
);
const LookupsPage = lazy(() =>
  import("./pages/admin/LookupsPage").then((m) => ({
    default: m.LookupsPage,
  })),
);
const ApplicationLinksPage = lazy(
  () => import("./pages/admin/ApplicationLinksPage"),
);
const SettingsManagementPage = lazy(() =>
  import("./pages/admin/SettingsManagementPage").then((m) => ({
    default: m.SettingsManagementPage,
  })),
);
const LicensePage = lazy(() =>
  import("./pages/admin/LicensePage").then((m) => ({
    default: m.LicensePage,
  })),
);
const CallCentrePage = lazy(() =>
  import("./pages/admin/CallCentrePage").then((m) => ({
    default: m.CallCentrePage,
  })),
);
const CallHistory = lazy(() =>
  import("./pages/admin/components/CallHistory").then((m) => ({
    default: m.CallHistory,
  })),
);
const EmailPage = lazy(() =>
  import("./pages/admin/EmailPage").then((m) => ({ default: m.EmailPage })),
);
const SMSPage = lazy(() =>
  import("./pages/admin/SMSPage").then((m) => ({ default: m.SMSPage })),
);
const GoalsPage = lazy(() =>
  import("./pages/admin/GoalsPage").then((m) => ({ default: m.GoalsPage })),
);
const GoalDetailPage = lazy(() => import("./pages/admin/GoalDetailPage"));
const GoalCreatePage = lazy(() =>
  import("./pages/admin/GoalCreatePage").then((m) => ({
    default: m.GoalCreatePage,
  })),
);
const GoalEditPage = lazy(() =>
  import("./pages/admin/GoalEditPage").then((m) => ({
    default: m.GoalEditPage,
  })),
);
const GoalApprovalsPage = lazy(() => import("./pages/admin/GoalApprovalsPage"));
const GoalTemplatesPage = lazy(() =>
  import("./pages/admin/GoalTemplatesPage").then((m) => ({
    default: m.GoalTemplatesPage,
  })),
);
const DocumentsPage = lazy(() =>
  import("./pages/admin/DocumentsPage").then((m) => ({
    default: m.DocumentsPage,
  })),
);
const MetricImportBatchesPage = lazy(
  () => import("./pages/admin/MetricImportBatchesPage"),
);
const MetricImportBatchDetailPage = lazy(
  () => import("./pages/admin/MetricImportBatchDetailPage"),
);
const GoalAnalyticsPage = lazy(() => import("./pages/admin/GoalAnalyticsPage"));
const OKRAlignmentPage = lazy(() => import("./pages/admin/OKRAlignmentPage"));
const ReviewCyclesPage = lazy(() =>
  import("./pages/admin/ReviewCyclesPage").then((m) => ({
    default: m.ReviewCyclesPage,
  })),
);
const ReviewCycleDetailPage = lazy(() =>
  import("./pages/admin/ReviewCycleDetailPage").then((m) => ({
    default: m.ReviewCycleDetailPage,
  })),
);
const MyReviewPage = lazy(() =>
  import("./pages/admin/MyReviewPage").then((m) => ({
    default: m.MyReviewPage,
  })),
);
const ReviewAssignmentPage = lazy(() =>
  import("./pages/admin/ReviewAssignmentPage").then((m) => ({
    default: m.ReviewAssignmentPage,
  })),
);
const EscalationConfigPage = lazy(() => import("./pages/admin/EsclationPage"));
const QualityAuditPage = lazy(() => import("./pages/admin/QualityAuditPage"));
const NotificationTemplatesPage = lazy(() =>
  import("./pages/admin/NotificationTemplatesPage").then((m) => ({
    default: m.NotificationTemplatesPage,
  })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RouteFallback() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-slate-500 dark:text-slate-400" />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <Toaster position="top-right" richColors closeButton />
        <BrowserRouter
          basename={
            window.APP_CONFIG?.BASE_PATH ||
            import.meta.env.VITE_BASE_PATH ||
            "/"
          }
        >
          <UserBootstrap>
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  {/* Auth routes */}
                  <Route element={<AuthLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route
                      path="/forgot-password"
                      element={<ForgotPasswordPage />}
                    />
                  </Route>

                  {/* SSO complete — public, bootstraps its own auth from URL params */}
                  <Route path="/sso-complete" element={<SSOCompletePage />} />

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
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[PERMISSIONS.USERS_VIEW]}
                          />
                        }
                      >
                        <Route path="/admin/users" element={<UsersPage />} />
                      </Route>
                      {/* Role management - requires roles:view permission */}
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[PERMISSIONS.ROLES_VIEW]}
                          />
                        }
                      >
                        <Route path="/admin/roles" element={<RolesPage />} />
                      </Route>
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[PERMISSIONS.ROLES_CREATE]}
                          />
                        }
                      >
                        <Route
                          path="/admin/roles/new"
                          element={<RoleCreatePage />}
                        />
                      </Route>
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[PERMISSIONS.ROLES_UPDATE]}
                          />
                        }
                      >
                        <Route
                          path="/admin/roles/:id/edit"
                          element={<RoleEditPage />}
                        />
                      </Route>
                      {/* Permission management - requires permissions:view permission */}
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[PERMISSIONS.PERMISSIONS_VIEW]}
                          />
                        }
                      >
                        <Route
                          path="/admin/permissions"
                          element={<PermissionsPage />}
                        />
                      </Route>
                      {/* Department management - requires departments:view permission */}
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[PERMISSIONS.DEPARTMENTS_VIEW]}
                          />
                        }
                      >
                        <Route
                          path="/admin/departments"
                          element={<DepartmentsPage />}
                        />
                        <Route
                          path="/admin/departments/:id"
                          element={<DepartmentDetailPage />}
                        />
                      </Route>
                      {/* Location management - requires locations:view permission */}
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[PERMISSIONS.LOCATIONS_VIEW]}
                          />
                        }
                      >
                        <Route
                          path="/admin/locations"
                          element={<LocationsPage />}
                        />
                        <Route
                          path="/admin/locations/map"
                          element={<LocationMapPage />}
                        />
                      </Route>
                      {/* Classification management - requires classifications:view permission */}
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[
                              PERMISSIONS.CLASSIFICATIONS_VIEW,
                            ]}
                          />
                        }
                      >
                        <Route
                          path="/admin/classifications"
                          element={<ClassificationsPage />}
                        />
                      </Route>
                      {/* Category (goal) management - requires categories:view permission */}
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[PERMISSIONS.CATEGORIES_VIEW]}
                          />
                        }
                      >
                        <Route
                          path="/admin/categories"
                          element={<CategoriesPage />}
                        />
                      </Route>
                      {/* Action logs - requires action-logs:view permission */}
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[PERMISSIONS.ACTION_LOGS_VIEW]}
                          />
                        }
                      >
                        <Route
                          path="/admin/action-logs"
                          element={<ActionLogsPage />}
                        />
                      </Route>
                      {/* Lookups - requires lookups:view permission */}
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[PERMISSIONS.LOOKUPS_VIEW]}
                          />
                        }
                      >
                        <Route
                          path="/admin/lookups"
                          element={<LookupsPage />}
                        />
                      </Route>
                      {/* Application Links - requires application-links:view permission */}
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[
                              PERMISSIONS.APPLICATION_LINKS_VIEW,
                            ]}
                          />
                        }
                      >
                        <Route
                          path="/admin/application-links"
                          element={<ApplicationLinksPage />}
                        />
                      </Route>
                      {/* Settings - requires settings:update permission */}
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[PERMISSIONS.SETTINGS_UPDATE]}
                          />
                        }
                      >
                        <Route
                          path="/admin/settings"
                          element={<SettingsManagementPage />}
                        />
                      </Route>
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[PERMISSIONS.LICENSE_VIEW]}
                          />
                        }
                      >
                        <Route
                          path="/admin/license"
                          element={<LicensePage />}
                        />
                      </Route>
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[PERMISSIONS.SETTINGS_UPDATE]}
                          />
                        }
                      >
                        <Route
                          path="/admin/escalation-groups"
                          element={<EscalationConfigPage />}
                        />
                        <Route
                          path="/admin/notification-templates"
                          element={<NotificationTemplatesPage />}
                        />
                      </Route>
                    </Route>
                  </Route>

                  {/* Workflow routes - separate layout */}
                  <Route element={<AdminProtectedRoute />}>
                    <Route
                      element={
                        <PermissionRoute
                          requiredPermissions={[PERMISSIONS.WORKFLOWS_VIEW]}
                        />
                      }
                    >
                      <Route element={<WorkflowLayout />}>
                        <Route path="/workflows" element={<WorkflowsPage />} />
                        <Route
                          path="/workflows/:id"
                          element={<WorkflowDesignerPage />}
                        />
                      </Route>
                    </Route>
                  </Route>

                  {/* Incident routes - separate layout */}
                  <Route element={<AdminProtectedRoute />}>
                    <Route element={<IncidentLayout />}>
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[
                              PERMISSIONS.QUALITY_AUDIT_VIEW,
                            ]}
                          />
                        }
                      >
                        <Route
                          path="/incidents/quality-audit"
                          element={<QualityAuditPage />}
                        />
                      </Route>
                      {/* Base route requires view permission, page handles redirect if no view_all */}
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[PERMISSIONS.INCIDENTS_VIEW]}
                          />
                        }
                      >
                        <Route path="/incidents" element={<IncidentsPage />} />
                        <Route
                          path="/incidents/:id"
                          element={<IncidentDetailPage />}
                        />
                        <Route
                          path="/incidents/:id/edit"
                          element={<IncidentEditPage />}
                        />
                      </Route>
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[
                              PERMISSIONS.INCIDENTS_TRANSITION,
                            ]}
                          />
                        }
                      >
                        <Route
                          path="/incidents/my-assigned"
                          element={<MyIncidentsPage type="assigned" />}
                        />
                      </Route>
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[PERMISSIONS.INCIDENTS_CREATE]}
                          />
                        }
                      >
                        <Route
                          path="/incidents/my-created"
                          element={<MyIncidentsPage type="created" />}
                        />
                        <Route
                          path="/incidents/new"
                          element={<IncidentCreatePage />}
                        />
                        <Route
                          path="/incidents/:id/clone"
                          element={<IncidentCreatePage />}
                        />
                      </Route>
                    </Route>
                  </Route>

                  {/* Request routes - dedicated layout */}
                  <Route element={<AdminProtectedRoute />}>
                    <Route element={<RequestLayout />}>
                      {/* Base route requires view permission, page handles redirect if no view_all */}
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[PERMISSIONS.REQUESTS_VIEW]}
                          />
                        }
                      >
                        <Route path="/requests" element={<RequestsPage />} />
                        <Route
                          path="/requests/:id"
                          element={<RequestDetailPage />}
                        />
                      </Route>
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[
                              PERMISSIONS.REQUESTS_TRANSITION,
                            ]}
                          />
                        }
                      >
                        <Route
                          path="/requests/my-assigned"
                          element={<MyRequestsPage type="assigned" />}
                        />
                      </Route>
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[PERMISSIONS.REQUESTS_CREATE]}
                          />
                        }
                      >
                        <Route
                          path="/requests/my-created"
                          element={<MyRequestsPage type="created" />}
                        />
                      </Route>
                    </Route>
                  </Route>

                  {/* Complaint routes - dedicated layout */}
                  <Route element={<AdminProtectedRoute />}>
                    <Route element={<ComplaintsLayout />}>
                      {/* Base route requires view permission, page handles redirect if no view_all */}
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[PERMISSIONS.COMPLAINTS_VIEW]}
                          />
                        }
                      >
                        <Route
                          path="/complaints"
                          element={<ComplaintsPage />}
                        />
                        <Route
                          path="/complaints/:id"
                          element={<ComplaintDetailPage />}
                        />
                      </Route>
                    </Route>
                  </Route>

                  {/* Query routes - dedicated layout */}
                  <Route element={<AdminProtectedRoute />}>
                    <Route element={<QueryLayout />}>
                      {/* Base route requires view permission, page handles redirect if no view_all */}
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[PERMISSIONS.QUERIES_VIEW]}
                          />
                        }
                      >
                        <Route path="/queries" element={<QueriesPage />} />
                        <Route
                          path="/queries/:id"
                          element={<QueryDetailPage />}
                        />
                      </Route>
                    </Route>
                  </Route>

                  {/* Reports routes - dedicated layout */}
                  <Route element={<AdminProtectedRoute />}>
                    <Route
                      element={
                        <PermissionRoute
                          requiredPermissions={[PERMISSIONS.REPORTS_VIEW]}
                        />
                      }
                    >
                      <Route element={<ReportsLayout />}>
                        <Route
                          path="/reports"
                          element={<ReportTemplatesPage />}
                        />
                        <Route
                          path="/reports/builder"
                          element={<ReportBuilderPage />}
                        />
                        <Route
                          path="/reports/builder/:templateId"
                          element={<ReportBuilderPage />}
                        />
                        <Route
                          path="/reports/templates"
                          element={<ReportTemplatesListPage />}
                        />
                        <Route
                          path="/reports/templates/:id/edit"
                          element={<ReportTemplateBuilderPage />}
                        />
                      </Route>
                    </Route>
                  </Route>

                  {/* Call Centre Management - dedicated layout */}
                  <Route element={<AdminProtectedRoute />}>
                    <Route element={<CallCentreLayout />}>
                      <Route
                        path="/call-centre"
                        element={
                          <Navigate to="/call-centre/contacts" replace />
                        }
                      />
                      <Route
                        path="/call-centre/contacts"
                        element={<CallCentrePage />}
                      />
                      <Route
                        path="/call-centre/history"
                        element={<CallHistory />}
                      />
                      <Route
                        path="/call-centre/email"
                        element={<EmailPage />}
                      />
                      <Route path="/call-centre/sms" element={<SMSPage />} />
                      {/* <Route path="/queries/:id" element={<QueryDetailPage />} /> */}
                    </Route>
                  </Route>

                  {/* Call Centre Management - dedicated layout */}
                  <Route element={<AdminProtectedRoute />}>
                    <Route element={<CallCentreLayout />}>
                      <Route
                        path="/call-centre"
                        element={
                          <Navigate to="/call-centre/contacts" replace />
                        }
                      />
                      <Route
                        path="/call-centre/contacts"
                        element={<CallCentrePage />}
                      />
                      <Route
                        path="/call-centre/history"
                        element={<CallHistory />}
                      />
                      <Route
                        path="/call-centre/email"
                        element={<EmailPage />}
                      />
                      <Route path="/call-centre/sms" element={<SMSPage />} />
                      {/* <Route path="/queries/:id" element={<QueryDetailPage />} /> */}
                    </Route>
                  </Route>

                  {/* Goal Management routes - dedicated layout */}
                  <Route element={<AdminProtectedRoute />}>
                    <Route element={<GoalLayout />}>
                      <Route
                        element={
                          <PermissionRoute
                            requiredPermissions={[PERMISSIONS.GOALS_VIEW]}
                          />
                        }
                      >
                        <Route path="/goals" element={<GoalsPage />} />
                        <Route path="/goals/mine" element={<GoalsPage />} />
                        <Route
                          path="/goals/analytics"
                          element={<GoalAnalyticsPage />}
                        />
                        <Route
                          path="/goals/okr-alignment"
                          element={<OKRAlignmentPage />}
                        />
                        <Route path="/goals/new" element={<GoalCreatePage />} />
                        <Route
                          path="/goals/templates"
                          element={<GoalTemplatesPage />}
                        />
                        <Route
                          path="/goals/approvals"
                          element={<GoalApprovalsPage />}
                        />
                        <Route
                          path="/goals/documents"
                          element={<DocumentsPage />}
                        />
                        <Route
                          path="/goals/metric-batches"
                          element={<MetricImportBatchesPage />}
                        />
                        <Route
                          path="/goals/metric-batches/:id"
                          element={<MetricImportBatchDetailPage />}
                        />
                        <Route
                          path="/goals/reviews"
                          element={<ReviewCyclesPage />}
                        />
                        <Route
                          path="/goals/reviews/my-reviews"
                          element={<MyReviewPage />}
                        />
                        <Route
                          path="/goals/reviews/assignments/:id"
                          element={<ReviewAssignmentPage />}
                        />
                        <Route
                          path="/goals/reviews/:id"
                          element={<ReviewCycleDetailPage />}
                        />
                        <Route path="/goals/:id" element={<GoalDetailPage />} />
                        <Route
                          path="/goals/:id/edit"
                          element={<GoalEditPage />}
                        />
                      </Route>
                    </Route>
                  </Route>

                  {/* Redirect root to dashboard or login */}
                  <Route
                    path="/"
                    element={<Navigate to="/dashboard" replace />}
                  />

                  {/* 404 redirect */}
                  <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                  />
                  <Route element={<CitizenAuthLayout />}>
                    <Route
                      path="/ivr/incident/sms-link/:id"
                      element={<CitizenVerifyPage />}
                    />
                  </Route>
                  <Route element={<CitizenLayout />}>
                    <Route
                      path="/ivr/incident/:id/update"
                      element={<CitizenIncidentUpdatePage />}
                    />
                  </Route>
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </UserBootstrap>
        </BrowserRouter>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;
