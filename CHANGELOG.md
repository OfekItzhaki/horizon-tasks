# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Task Lifecycle Automation** (Backend v0.2.0, Mobile v1.2.0)
  - Auto-reset for repeating tasks (DAILY at midnight, WEEKLY on Monday, MONTHLY on 1st, YEARLY on Jan 1st)
  - Auto-archive completed tasks from CUSTOM lists to "Finished Tasks" list after 5 minutes
  - System "Finished Tasks" list (undeletable) for archived completed tasks
  - `completedAt` timestamp tracking for tasks
  - `isSystem` flag for protected system lists
  - NestJS scheduled tasks using @nestjs/schedule
- Step editing functionality with inline edit/save/cancel
- Reminder time persistence (client-side storage for custom times)
- Alarm toggle for reminders (sound/vibration control)
- Enhanced empty states with icons and better messaging
- Reminder display in task details view
- Comprehensive debugging documentation (HOW_TO_VIEW_LOGS.md)
- Network troubleshooting guide (NETWORK_TROUBLESHOOTING.md)

### Changed
- Removed success alert dialogs (less intrusive UX)
- Improved date formatting (relative dates: "Today", "Tomorrow")
- Time input format changed to HHMM (numeric keyboard friendly)
- Better error messages with specific titles

### Fixed
- Multiple reminders not saving correctly
- Reminder times not persisting after edit
- Weekly reminders not saving with daily reminders
- Network connection issues (CORS, IP address configuration)
- UTF-8 BOM character in .env file
- URL encoding for API calls (query parameters and path segments)
- Expo Go notification errors (graceful degradation)

## [1.0.0] - Initial Release

### Added
- User authentication (login/register)
- To-Do Lists CRUD
- Tasks CRUD with completion tracking
- Steps/sub-tasks management
- Task search and sorting
- Date picker for task due dates
- Pull-to-refresh functionality
- Profile screen


