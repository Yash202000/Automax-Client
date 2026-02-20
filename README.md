# Automax Client

A modern React-based admin dashboard for incident and workflow management.

## Technology Stack

- **Framework:** React 19.2
- **Build Tool:** Vite 7.2
- **Language:** TypeScript 5.9
- **Styling:** Tailwind CSS 4.1
- **State Management:** Zustand 5.0
- **Data Fetching:** TanStack React Query 5.90
- **Routing:** React Router DOM 7.12
- **Forms:** React Hook Form 7.71 + Zod 4.3
- **Icons:** Lucide React, Heroicons
- **Internationalization:** i18next 25.7

## Features

- **Authentication & Authorization**
  - JWT-based authentication with refresh token rotation
  - Role-based access control (RBAC)
  - Protected routes and permission-based rendering

- **Dashboard & Management**
  - User, role, and permission management
  - Department and location management
  - Classification management
  - Action logging and audit trails

- **Core Business Features**
  - Incidents, Requests, Complaints, and Queries management
  - Visual workflow designer (XY Flow)
  - Advanced report builder with Excel export
  - SLA tracking and monitoring

- **Additional Features**
  - Multi-language support (i18n)
  - Location mapping with Leaflet
  - SIP/VoIP softphone integration
  - SMTP configuration for notifications

## Project Structure

```
Automax-Client/
├── src/
│   ├── api/                # API integration (Axios)
│   │   ├── client.ts       # Axios instance with interceptors
│   │   ├── auth.ts         # Authentication endpoints
│   │   └── admin.ts        # Business logic APIs
│   ├── components/
│   │   ├── layout/         # Layout components
│   │   ├── auth/           # Auth components
│   │   ├── ui/             # Reusable UI components
│   │   ├── workflow/       # Workflow visualization
│   │   ├── incidents/      # Incident components
│   │   ├── complaints/     # Complaint components
│   │   ├── queries/        # Query components
│   │   ├── reports/        # Report builder
│   │   ├── maps/           # Leaflet maps
│   │   └── sip/            # VoIP softphone
│   ├── pages/
│   │   ├── admin/          # Admin pages
│   │   ├── DashboardPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── LoginPage.tsx
│   │   └── ...
│   ├── stores/             # Zustand stores
│   ├── hooks/              # Custom React hooks
│   ├── constants/          # App constants
│   ├── types/              # TypeScript definitions
│   ├── lib/                # Utilities
│   ├── i18n/               # Internationalization
│   ├── App.tsx             # Main app with routing
│   └── main.tsx            # Entry point
├── public/                 # Static assets
├── dist/                   # Build output
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── Dockerfile
└── .env.example
```

## Prerequisites

- Node.js 20+
- npm or yarn

## Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:8080/api/v1
```

## Installation & Running

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Automax-Client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

### Using Docker

1. **Build the image**
   ```bash
   docker build -t automax-client .
   ```

2. **Run the container**
   ```bash
   docker run -p 3000:3000 -e VITE_API_URL=http://api.example.com/api/v1 automax-client
   ```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Routing Structure

### Public Routes
- `/login` - Login page
- `/register` - Registration page

### Protected Routes
- `/dashboard` - Main dashboard
- `/profile` - User profile
- `/settings` - User settings

### Admin Routes
- `/admin/users` - User management
- `/admin/roles` - Role management
- `/admin/departments` - Department management
- `/admin/locations` - Location management
- `/admin/classifications` - Classification management
- `/admin/workflows` - Workflow management
- `/reports` - Report builder
- `/admin/action-logs` - Audit logs
- `/admin/smtp-settings` - SMTP configuration
- `/admin/lookups` - Lookup values

### Feature Routes
- `/incidents` - Incidents list
- `/incidents/new` - Create incident
- `/incidents/:id` - Incident details
- `/requests` - Requests list
- `/requests/:id` - Request details
- `/complaints` - Complaints list
- `/complaints/:id` - Complaint details
- `/queries` - Queries list
- `/queries/:id` - Query details
- `/workflows/:id` - Workflow designer

## Permission System

The app uses granular permissions for access control:

- **Dashboard:** `dashboard:view`, `dashboard:admin`
- **Users:** `users:view`, `users:create`, `users:update`, `users:delete`
- **Roles:** `roles:view`, `roles:create`, `roles:update`, `roles:delete`
- **Incidents:** `incidents:view`, `incidents:create`, `incidents:update`, `incidents:delete`
- **Workflows:** `workflows:view`, `workflows:create`, `workflows:update`, `workflows:delete`
- **Reports:** `reports:view`, `reports:create`, `reports:update`, `reports:delete`

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.2 | UI framework |
| vite | 7.2 | Build tool |
| typescript | 5.9 | Type safety |
| tailwindcss | 4.1 | Styling |
| zustand | 5.0 | State management |
| @tanstack/react-query | 5.90 | Data fetching |
| react-router-dom | 7.12 | Routing |
| react-hook-form | 7.71 | Form handling |
| zod | 4.3 | Validation |
| @xyflow/react | 12.10 | Workflow diagrams |
| leaflet | 1.9 | Maps |
| i18next | 25.7 | Internationalization |
| xlsx | 0.18 | Excel export |
| axios | 1.13 | HTTP client |

## API Integration

The app communicates with the backend via Axios with:
- Automatic token injection
- Refresh token rotation on 401
- Request/response interceptors
- Error handling

Configuration priority:
1. `window.APP_CONFIG?.API_URL` (Docker runtime)
2. `import.meta.env.VITE_API_URL` (Vite env)
3. Default fallback

## Development Notes

### Adding New Pages
1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add permission check if needed

### Adding New API Endpoints
1. Add function in `src/api/admin.ts`
2. Create TypeScript types in `src/types/`
3. Use with React Query in components

### Internationalization
1. Add translations in `src/i18n/locales/`
2. Use `useTranslation` hook in components

## License

Proprietary - All rights reserved
