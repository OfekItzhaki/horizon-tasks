# Horizon Tasks
> by **Horizon Labs** 🧪

## Overview
**Horizon Tasks** is a powerful, full-stack task management solution designed to help you organize your life with clarity and precision. Built with a modern tech stack, it seamlessly syncs across Web and Mobile.

- **Lists & tasks** — Daily, weekly, monthly, yearly, and custom lists with tasks, steps, and due dates.
- **Reminders** — Per-task reminders (specific date, every day/week/month/year, days before due). Optional **location** (e.g. address or place name) per reminder; shown in task view and in notification body on web and mobile.
- **Notifications** — Browser notifications (web) and push notifications (mobile) for reminders, including task name, time, location (when set), and due-date context.
- **Shared logic** — Reminder types and helpers (`ReminderConfig`, convert/format) live in `frontend-services` and are used by both web-app and mobile-app.

## Repo structure

| Package            | Description                                      |
|--------------------|--------------------------------------------------|
| `todo-backend`     | NestJS API (Prisma, JWT auth, reminderConfig)   |
| `frontend-services`| Shared API client, types, **reminders module**  |
| `web-app`          | React + Vite SPA                                |
| `mobile-app`       | React Native + Expo                             |
