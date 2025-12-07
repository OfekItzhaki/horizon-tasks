# Reminders Pipeline Feature

## Overview

The reminders pipeline provides a front-end agnostic way to retrieve formatted reminder notifications. The backend calculates which tasks need reminders and returns structured data (title, message, metadata) that can be used by any front-end to send push notifications.

## Architecture

The reminders system is designed to be **front-end agnostic**. Instead of sending push notifications directly, the backend:

1. **Calculates** which tasks need reminders based on:
   - Task due dates
   - Task-specific day of week
   - List type (Daily, Weekly, Monthly, Yearly)
   - Reminder days before setting

2. **Formats** reminder data into structured notifications with:
   - Title
   - Message text
   - Task metadata
   - Due date information

3. **Returns** JSON data that front-end can consume for:
   - Push notifications (web, mobile)
   - Email notifications
   - In-app notifications
   - SMS notifications

## API Endpoints

### GET `/reminders/today`
Get all reminder notifications for today.

**Response:**
```json
[
  {
    "taskId": 1,
    "taskDescription": "Complete project",
    "dueDate": "2024-12-26T00:00:00.000Z",
    "reminderDate": "2024-12-25T00:00:00.000Z",
    "message": "\"Complete project\" from Daily is due tomorrow.",
    "title": "Reminder: Complete project",
    "listName": "Daily",
    "listType": "DAILY"
  }
]
```

### GET `/reminders/date?date=YYYY-MM-DD`
Get reminder notifications for a specific date.

**Query Parameters:**
- `date` (optional): Date in YYYY-MM-DD format (defaults to today)

### GET `/reminders/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
Get all reminder notifications for a date range. Useful for scheduling multiple notifications in advance.

**Query Parameters:**
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format

**Response:** Returns unique reminders (deduplicated) for the date range.

## Reminder Calculation Logic

### Task Due Date Calculation

1. **Explicit Due Date**: Uses `task.dueDate` if set
2. **Specific Day of Week**: Calculates next occurrence of `task.specificDayOfWeek`
3. **List-Based Tasks**:
   - **DAILY**: Every day
   - **WEEKLY**: Next Sunday (start of week)
   - **MONTHLY**: First day of next month
   - **YEARLY**: January 1st of next year

### Reminder Date Calculation

Reminder is shown `reminderDaysBefore` days before the due date:
```
Reminder Date = Due Date - reminderDaysBefore days
```

## Front-End Integration

### Example: Web Push Notifications

```typescript
// Fetch reminders
const response = await fetch('/reminders/today', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const reminders = await response.json();

// Schedule push notifications
reminders.forEach(reminder => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(reminder.title, {
      body: reminder.message,
      icon: '/icon.png',
      tag: `task-${reminder.taskId}`,
      data: {
        taskId: reminder.taskId,
        dueDate: reminder.dueDate
      }
    });
  }
});
```

### Example: Mobile Push Notifications

```typescript
// Fetch reminders
const reminders = await api.get('/reminders/today');

// Send to push notification service
reminders.forEach(reminder => {
  pushNotificationService.send({
    title: reminder.title,
    body: reminder.message,
    data: {
      taskId: reminder.taskId,
      listName: reminder.listName,
      dueDate: reminder.dueDate
    }
  });
});
```

### Example: Scheduled Notifications

```typescript
// Fetch reminders for next 7 days
const reminders = await api.get('/reminders/range', {
  params: {
    startDate: today,
    endDate: nextWeek
  }
});

// Schedule all notifications
reminders.forEach(reminder => {
  scheduleNotification({
    date: reminder.reminderDate,
    title: reminder.title,
    message: reminder.message,
    taskId: reminder.taskId
  });
});
```

## Message Formatting

### Title Format
```
Reminder: {taskDescription}
```

### Message Format

**With Due Date:**
- Due today: `"{taskDescription}" from {listName} is due today!`
- Due tomorrow: `"{taskDescription}" from {listName} is due tomorrow.`
- Due in N days: `"{taskDescription}" from {listName} is due in {N} days.`

**Without Due Date:**
```
Reminder: "{taskDescription}" from {listName}
```

## Data Structure

### ReminderNotification Interface

```typescript
interface ReminderNotification {
  taskId: number;              // Task ID for navigation
  taskDescription: string;       // Task description
  dueDate: Date | null;          // When the task is due
  reminderDate: Date;            // When the reminder should be shown
  message: string;               // Formatted message for notification
  title: string;                 // Notification title
  listName: string;               // List name for context
  listType: string;              // List type (DAILY, WEEKLY, etc.)
}
```

## Authentication

All reminder endpoints require JWT authentication:
```
Authorization: Bearer <token>
```

## Best Practices for Front-End

1. **Polling**: Poll `/reminders/today` periodically (e.g., every hour)
2. **Scheduling**: Use `/reminders/range` to fetch upcoming reminders and schedule them locally
3. **Deduplication**: Use `taskId` to avoid showing duplicate notifications
4. **User Preferences**: Respect user notification preferences before showing reminders
5. **Offline Support**: Cache reminders locally for offline access

## Future Enhancements

- [ ] Webhook support for real-time reminder delivery
- [ ] Email notification integration
- [ ] SMS notification integration
- [ ] User-configurable reminder times (not just days before)
- [ ] Recurring reminder support
- [ ] Reminder acknowledgment tracking

