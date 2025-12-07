# Multiple Reminders Guide

## Overview

The system now supports **multiple reminders per task**. For example, you can set a task to remind you 7 days before AND 1 day before the deadline.

## How It Works

### Example Scenario: Vehicle Registration

Let's say you have a task "Renew vehicle registration" with:
- **Due Date**: December 31, 2024
- **Reminder Days**: `[7, 1]` (7 days before AND 1 day before)

Here's what happens:

1. **December 24, 2024** (7 days before):
   - Backend calculates: Due date (Dec 31) - 7 days = Dec 24
   - Returns reminder notification: "Renew vehicle registration is due in 7 days"
   - Front-end receives this and shows push notification

2. **December 30, 2024** (1 day before):
   - Backend calculates: Due date (Dec 31) - 1 day = Dec 30
   - Returns reminder notification: "Renew vehicle registration is due tomorrow"
   - Front-end receives this and shows push notification

## Backend Implementation

### Database Schema

The `Task` model now stores `reminderDaysBefore` as an **array of integers**:

```prisma
model Task {
  reminderDaysBefore Int[] @default([1])  // Array: [7, 1] means 7 days and 1 day before
}
```

### API Usage

#### Creating a Task with Multiple Reminders

```json
POST /tasks/todo-list/1
{
  "description": "Renew vehicle registration",
  "dueDate": "2024-12-31T00:00:00Z",
  "reminderDaysBefore": [7, 1]  // 7 days AND 1 day before
}
```

#### Updating Reminders

```json
PATCH /tasks/123
{
  "reminderDaysBefore": [14, 7, 1]  // Add 14 days reminder too
}
```

### Reminder Endpoints

#### GET `/reminders/today`
Returns all reminders that should be shown **today**:

```json
[
  {
    "taskId": 1,
    "taskDescription": "Renew vehicle registration",
    "dueDate": "2024-12-31T00:00:00.000Z",
    "reminderDate": "2024-12-24T00:00:00.000Z",
    "reminderDaysBefore": 7,  // This is the 7-day reminder
    "message": "\"Renew vehicle registration\" from Yearly is due in 7 days.",
    "title": "Reminder: Renew vehicle registration",
    "listName": "Yearly",
    "listType": "YEARLY"
  }
]
```

**Note**: If multiple reminders fall on the same day, you'll get multiple notification objects (one for each reminder day).

#### GET `/reminders/range?startDate=2024-12-20&endDate=2024-12-31`
Get all reminders in a date range. Useful for scheduling notifications in advance.

## Front-End Implementation

### What the Front-End Needs to Do

The front-end needs a **reminder polling/scheduling service** that:

1. **Fetches reminders** from the backend
2. **Schedules push notifications** for each reminder
3. **Handles notification display** when the time comes

### Recommended Architecture

#### Option 1: Polling Service (Simple)

```typescript
// reminder-service.ts
class ReminderService {
  private pollingInterval: NodeJS.Timeout | null = null;

  async startPolling() {
    // Poll every hour for today's reminders
    this.pollingInterval = setInterval(async () => {
      const reminders = await this.fetchTodayReminders();
      await this.scheduleNotifications(reminders);
    }, 60 * 60 * 1000); // 1 hour

    // Also check immediately on startup
    const reminders = await this.fetchTodayReminders();
    await this.scheduleNotifications(reminders);
  }

  async fetchTodayReminders() {
    const response = await fetch('/reminders/today', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    return await response.json();
  }

  async scheduleNotifications(reminders: ReminderNotification[]) {
    for (const reminder of reminders) {
      // Check if notification already scheduled
      const notificationId = `reminder-${reminder.taskId}-${reminder.reminderDaysBefore}`;
      
      if (!this.isNotificationScheduled(notificationId)) {
        // Schedule push notification
        await this.schedulePushNotification({
          id: notificationId,
          title: reminder.title,
          body: reminder.message,
          scheduledTime: reminder.reminderDate,
          data: {
            taskId: reminder.taskId,
            dueDate: reminder.dueDate
          }
        });
      }
    }
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }
}
```

#### Option 2: Advance Scheduling (Recommended)

```typescript
// reminder-service.ts
class ReminderService {
  async scheduleAllUpcomingReminders() {
    // Fetch reminders for next 30 days
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const reminders = await fetch(
      `/reminders/range?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    ).then(r => r.json());

    // Schedule all notifications
    for (const reminder of reminders) {
      const notificationId = `reminder-${reminder.taskId}-${reminder.reminderDaysBefore}`;
      
      await this.schedulePushNotification({
        id: notificationId,
        title: reminder.title,
        body: reminder.message,
        scheduledTime: reminder.reminderDate,
        data: {
          taskId: reminder.taskId,
          dueDate: reminder.dueDate
        }
      });
    }

    // Re-schedule every day to catch new tasks
    setTimeout(() => {
      this.scheduleAllUpcomingReminders();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }
}
```

### Platform-Specific Implementation

#### Web (Service Worker)

```typescript
// In your service worker
self.addEventListener('message', async (event) => {
  if (event.data.type === 'SCHEDULE_REMINDER') {
    const { reminder } = event.data;
    
    // Use Notification API with scheduled time
    // Note: Web doesn't support scheduled notifications natively
    // You'll need to use a library or check periodically
    
    const delay = reminder.reminderDate.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(() => {
        self.registration.showNotification(reminder.title, {
          body: reminder.message,
          tag: `reminder-${reminder.taskId}-${reminder.reminderDaysBefore}`,
          data: {
            taskId: reminder.taskId,
            dueDate: reminder.dueDate
          }
        });
      }, delay);
    }
  }
});
```

#### React Native (Expo)

```typescript
import * as Notifications from 'expo-notifications';

async function scheduleReminder(reminder: ReminderNotification) {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: reminder.message,
      data: {
        taskId: reminder.taskId,
        dueDate: reminder.dueDate
      }
    },
    trigger: {
      date: reminder.reminderDate
    }
  });

  return notificationId;
}
```

#### Native Mobile (iOS/Android)

Use platform-specific scheduling APIs:
- **iOS**: `UNUserNotificationCenter` with `UNCalendarNotificationTrigger`
- **Android**: `AlarmManager` or `WorkManager`

### Handling Duplicate Notifications

Since the same task can have multiple reminders, use a unique ID:

```typescript
const notificationId = `reminder-${reminder.taskId}-${reminder.reminderDaysBefore}`;
```

This ensures:
- 7-day reminder: `reminder-1-7`
- 1-day reminder: `reminder-1-1`

They won't conflict even though they're for the same task.

## Migration

### Running the Migration

```bash
npx prisma migrate dev --name add_multiple_reminders
```

This will:
1. Convert existing `reminderDaysBefore` values to arrays
2. Update the schema to use `Int[]` type
3. Set default to `[1]` for backward compatibility

### Backward Compatibility

The code handles both old and new formats:
- Old tasks with single value: Automatically converted to array `[value]`
- New tasks: Use array format `[7, 1]`

## Example Flow

### User Creates Task

1. User creates task: "Renew vehicle registration"
2. Sets due date: December 31, 2024
3. Sets reminders: `[7, 1]` (7 days and 1 day before)

### Backend Processing

1. Task stored with `reminderDaysBefore: [7, 1]`
2. On December 24: Backend calculates reminder for 7 days before
3. On December 30: Backend calculates reminder for 1 day before

### Front-End Actions

1. **On app startup**: Fetch reminders for next 30 days
2. **Schedule notifications**: Create scheduled notifications for each reminder
3. **On notification time**: Show push notification to user
4. **User taps notification**: Navigate to task details

### Daily Polling (Alternative)

1. **Every hour**: Poll `/reminders/today`
2. **If reminders found**: Show immediate notification
3. **Mark as shown**: Store notification IDs to avoid duplicates

## Best Practices

1. **Deduplication**: Use unique notification IDs to prevent duplicate notifications
2. **Offline Support**: Cache reminders locally for offline access
3. **User Preferences**: Respect user's notification preferences
4. **Battery Optimization**: Use platform-specific scheduling instead of constant polling
5. **Error Handling**: Handle cases where notifications can't be scheduled (permissions, etc.)

## Testing

### Test Multiple Reminders

```bash
# Create task with multiple reminders
curl -X POST http://localhost:3000/tasks/todo-list/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test task",
    "dueDate": "2024-12-31T00:00:00Z",
    "reminderDaysBefore": [7, 1]
  }'

# Check reminders for Dec 24 (7 days before)
curl http://localhost:3000/reminders/date?date=2024-12-24 \
  -H "Authorization: Bearer $TOKEN"

# Check reminders for Dec 30 (1 day before)
curl http://localhost:3000/reminders/date?date=2024-12-30 \
  -H "Authorization: Bearer $TOKEN"
```

## Summary

- ✅ Backend supports multiple reminder days per task
- ✅ Returns structured notification data
- ✅ Front-end needs to implement scheduling/polling service
- ✅ Each reminder gets its own notification
- ✅ Backward compatible with existing single-reminder tasks

