# Tasks Management - Web Frontend

A modern React 19+ web application for managing tasks and todo lists.

## Tech Stack

- **React 19** - Latest React with modern features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **ESLint + Prettier** - Code quality and formatting

## Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm/yarn

### Installation

1. Install dependencies:
```bash
npm install
# or
pnpm install
# or
yarn install
```

2. Set up environment variables (optional):
Create a `.env` file in the root:
```
VITE_API_BASE_URL=http://localhost:3000
```

3. Build the frontend-services package first (if needed):
```bash
cd ../frontend-services
npm run build
cd ../web-app
```

4. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Project Structure

```
web-app/
├── src/
│   ├── components/     # Reusable components
│   ├── context/        # React Context providers
│   ├── pages/          # Page components (routes)
│   ├── services/       # API service wrappers
│   ├── config/         # Configuration files
│   ├── App.tsx         # Main app component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── public/             # Static assets
├── index.html          # HTML template
└── vite.config.ts      # Vite configuration
```

## Features

- 🔐 Authentication (Login/Logout)
- 📋 Todo Lists Management
- ✅ Tasks Management
- 📝 Task Details with Steps
- 🔔 Reminders (specific date, every day/week/month/year, days before due) with optional **location**; shared logic from `frontend-services`
- 🔕 Browser notifications for reminders (task name, time, location when set)
- 👤 User Profile

### Verifying notifications

1. **Test notification (dev only)**  
   With `npm run dev`, log in, then open the browser console and run:
   ```js
   await window.__tasksTestNotification?.()
   ```
   If you see a test notification, permissions and delivery work.

2. **Custom reminder “in a few minutes”**  
   Edit a task → Add reminder → **Specific Date** → **Custom Date** → today’s date → time = current time + 2–3 minutes → Save.  
   - Check the console for `[Notifications] Scheduled … in X s`.  
   - If the reminder time has already passed when you save, you should get a notification **immediately** (and see `[Notifications] Firing immediately …`).

3. **If you don’t get notifications**  
   - Ensure the site has notification permission (browser address bar / site settings).  
   - In dev, look for `[Notifications] Skipped: …` or `[Notifications] Firing immediately …` / `Scheduled …` to see what the service is doing.
