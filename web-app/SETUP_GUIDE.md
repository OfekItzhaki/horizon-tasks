# React 19+ Web Frontend Boilerplate Setup Guide

This guide explains how to create this React 19+ boilerplate from scratch and what each part does.

## Overview

This is a modern React 19+ web application boilerplate using:
- **Vite** (build tool - faster than Create React App)
- **React 19** (latest React version)
- **TypeScript** (type safety)
- **React Router v6** (client-side routing)
- **Tailwind CSS** (utility-first CSS)
- **ESLint + Prettier** (code quality)

## Step-by-Step Creation Process

### 1. Initialize the Project Structure

```bash
# Create the web-app directory
mkdir web-app
cd web-app
```

### 2. Initialize package.json

Create `package.json` with:
- **React 19** as dependencies
- **Vite** and related plugins as dev dependencies
- **React Router** for routing
- **Tailwind CSS** for styling
- Link to `@tasks-management/frontend-services` package

Key dependencies:
- `react@^19.0.0` and `react-dom@^19.0.0` - React 19
- `react-router-dom@^6.28.0` - Routing
- `@vitejs/plugin-react@^4.3.4` - Vite React plugin
- `vite@^6.0.5` - Build tool
- `typescript@^5.7.2` - TypeScript
- `tailwindcss@^3.4.17` - Tailwind CSS
- `eslint` and `prettier` - Code quality tools

### 3. Configure TypeScript

Create `tsconfig.json`:
- Targets ES2020
- Uses "react-jsx" transform (React 19 style)
- Strict mode enabled
- Path aliases configured (`@/*` maps to `./src/*`)

Create `tsconfig.node.json` for Node.js config files (like vite.config.ts)

### 4. Configure Vite

Create `vite.config.ts`:
- Uses `@vitejs/plugin-react` plugin
- Sets up path aliases (`@` → `./src`)
- Configures dev server (port 5173, auto-open browser)

**Why Vite?**
- Much faster than Create React App (uses esbuild for dev, Rollup for prod)
- Native ESM support
- Hot Module Replacement (HMR)
- Optimized builds

### 5. Configure Tailwind CSS

Create `tailwind.config.js`:
- Content paths for purging unused styles
- Basic theme configuration

Create `postcss.config.js`:
- Includes Tailwind and Autoprefixer plugins

**Why Tailwind?**
- Utility-first CSS
- No custom CSS files needed
- Responsive design built-in
- Small production bundle (only used classes are included)

### 6. Configure ESLint & Prettier

Create `.eslintrc.cjs`:
- TypeScript ESLint rules
- React Hooks rules
- React Refresh plugin

Create `.prettierrc`:
- Code formatting rules (semicolons, quotes, etc.)

### 7. Create Entry Files

**index.html** (root):
- Basic HTML structure
- Single `<div id="root">` for React to mount
- Script tag pointing to `/src/main.tsx`

**src/main.tsx**:
- Uses `createRoot` API (React 19)
- Wraps app in `<StrictMode>`
- Wraps in `<BrowserRouter>` for routing
- Imports global CSS

**src/index.css**:
- Tailwind directives (`@tailwind base/components/utilities`)
- Basic font-family reset

### 8. Create App Structure

**src/App.tsx**:
- Main app component
- Defines all routes using React Router
- Wraps routes in `AuthProvider`
- Uses `ProtectedRoute` component for auth
- Layout component wraps authenticated pages

**Routes:**
- `/login` - Login page (public)
- `/` - Protected route wrapper
  - `/lists` - Lists page (default)
  - `/lists/:listId/tasks` - Tasks for a list
  - `/tasks/:taskId` - Task details
  - `/profile` - User profile

### 9. Create Context (Auth)

**src/context/AuthContext.tsx**:
- React Context for authentication state
- Provides `user`, `loading`, `login`, `logout`, `isAuthenticated`
- Checks auth on mount
- Uses `authService` from frontend-services

**Why Context?**
- Global state management without Redux
- Simple for auth state
- Easy to use with `useAuth()` hook

### 10. Create Components

**src/components/ProtectedRoute.tsx**:
- Higher-order component pattern
- Checks authentication
- Shows loading state
- Redirects to login if not authenticated

**src/components/Layout.tsx**:
- Navigation bar
- User info display
- Logout button
- `<Outlet />` for nested routes

### 11. Create Pages

**src/pages/LoginPage.tsx**:
- Login form (email/password)
- Error handling
- Loading states
- Redirects to `/lists` on success

**src/pages/ListsPage.tsx**:
- Displays all todo lists
- Grid layout with Tailwind
- Links to tasks page
- Error and loading states

**src/pages/TasksPage.tsx**:
- Displays tasks for a list
- Back navigation
- Checkbox display for completed tasks
- Links to task details

**src/pages/TaskDetailsPage.tsx**:
- Full task details
- Steps display
- Back navigation

**src/pages/ProfilePage.tsx**:
- User profile information
- Email, name, verification status

### 12. Create Services

**src/services/auth.service.ts**:
- Wrapper around `@tasks-management/frontend-services`
- Provides `login`, `logout`, `getCurrentUser`

**src/services/lists.service.ts**:
- Wrapper for lists operations
- `getAllLists`, `getListById`, `createList`, etc.

**src/services/tasks.service.ts**:
- Wrapper for tasks operations
- `getAllTasks`, `getTaskById`, `createTask`, etc.

**Why service wrappers?**
- Can add web-specific logic
- Consistent API for components
- Easy to swap implementations

## File Structure

```
web-app/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── Layout.tsx
│   │   └── ProtectedRoute.tsx
│   ├── context/         # React Context providers
│   │   └── AuthContext.tsx
│   ├── pages/           # Page components (routes)
│   │   ├── LoginPage.tsx
│   │   ├── ListsPage.tsx
│   │   ├── TasksPage.tsx
│   │   ├── TaskDetailsPage.tsx
│   │   └── ProfilePage.tsx
│   ├── services/        # API service wrappers
│   │   ├── auth.service.ts
│   │   ├── lists.service.ts
│   │   └── tasks.service.ts
│   ├── config/          # Configuration
│   │   └── api.ts
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── .gitignore
├── .eslintrc.cjs        # ESLint config
├── .prettierrc          # Prettier config
├── index.html           # HTML template
├── package.json
├── postcss.config.js    # PostCSS config (Tailwind)
├── tailwind.config.js   # Tailwind config
├── tsconfig.json        # TypeScript config
├── tsconfig.node.json   # TypeScript config for Node files
└── vite.config.ts       # Vite config
```

## Key Concepts Explained

### Vite vs Create React App

**Vite advantages:**
- Uses native ESM (no bundling in dev)
- Instant server start
- Lightning-fast HMR
- Optimized production builds

**Create React App:**
- Older, slower
- Webpack-based (slower dev server)
- Being deprecated

### React 19 Features Used

- `createRoot` API (not ReactDOM.render)
- JSX Transform (no need to import React)
- Improved TypeScript support

### React Router v6

- `Routes` and `Route` components
- `Navigate` for redirects
- `useNavigate` hook
- `Outlet` for nested routes
- Relative routing

### Tailwind CSS

- Utility classes instead of CSS files
- `className="bg-white p-4 rounded-lg shadow"`
- Responsive: `sm:`, `md:`, `lg:` prefixes
- Hover: `hover:bg-gray-100`
- Production: Only used classes included

## Getting Started

1. Install dependencies: `npm install`
2. Build frontend-services: `cd ../frontend-services && npm run build`
3. Start dev server: `npm run dev`
4. Open browser: `http://localhost:5173`

## Next Steps

- Add more features (create/edit lists, tasks)
- Add form validation (React Hook Form)
- Add state management (Zustand/Jotai if needed)
- Add error boundaries
- Add loading skeletons
- Add animations (Framer Motion)
- Add tests (Vitest + React Testing Library)
