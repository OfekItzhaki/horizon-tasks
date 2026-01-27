# Tasks Management Mobile App

React Native mobile app built with Expo for managing to-do lists, tasks, and reminders.

## Features

- ✅ User authentication (login/register)
- 📋 To-Do Lists management (Daily, Weekly, Monthly, Yearly, Custom)
- ✅ Tasks with completion tracking
- 📝 Sub-tasks (Steps)
- 🔔 Reminders (specific date, every day/week/month/year, days before due) with optional **location**; shared logic from `frontend-services`
- 🔕 Push notifications for reminders (task name, time, location when set) (⚠️ See Note Below)
- 👥 List sharing
- 📱 Native iOS and Android support

⚠️ **Notification Testing Note:** Android push notifications are **not supported in Expo Go**. To test notifications on Android, you'll need to build a development build or production build.

## Prerequisites

- Node.js (v20.4.0 or higher recommended)
- npm or yarn
- Expo Go app on your phone (for testing) OR iOS Simulator / Android Emulator

## Setup

1. **Install dependencies:**
   ```bash
   cd mobile-app
   npm install
   ```

2. **Configure API URL:**
   
   Create a `.env` file in the `mobile-app` directory:
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:3000
   ```
   
   Or update `src/config/api.ts` directly:
   ```typescript
   export const API_CONFIG = {
     baseURL: 'http://your-backend-url:3000',
   };
   ```

   **Note:** For testing on a physical device, use your computer's local IP address instead of `localhost`:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.XXX:3000
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on device/simulator:**
   - Press `i` for iOS Simulator (macOS only)
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app on your phone

## Project Structure

```
mobile-app/
├── src/
│   ├── config/          # API configuration
│   ├── context/         # React contexts (Auth)
│   ├── navigation/      # Navigation setup
│   ├── screens/         # Screen components
│   ├── services/        # API service layer
│   ├── types/           # TypeScript types
│   └── utils/           # Utilities (storage, API client)
├── App.tsx              # Root component
└── package.json
```

## API Integration

The app uses direct HTTP calls to your NestJS backend. All API services are in `src/services/`:

- `auth.service.ts` - Authentication
- `lists.service.ts` - To-Do Lists
- `tasks.service.ts` - Tasks
- `steps.service.ts` - Sub-tasks
- `notifications.service.ts` - Push notifications (handles reminders)
- `sharing.service.ts` - List sharing

## Development

### Running the app

```bash
# Start Expo dev server
npm start

# Run on iOS (macOS only)
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

### Building for production

```bash
# Build for iOS/Android
npx expo build:android
npx expo build:ios
```

## Authentication Flow

1. User logs in or registers
2. JWT token is stored in AsyncStorage
3. Token is automatically added to all API requests
4. Navigation updates based on auth state

## Next Steps

### ✅ Completed
- [x] Add push notifications for reminders (requires dev/prod build on Android)
- [x] Implement task creation/editing UI
- [x] Add step management UI (add, toggle, delete)
- [x] Add pull-to-refresh (on ListsScreen and TasksScreen)
- [x] Implement search functionality (on TasksScreen)
- [x] Task sorting (by due date, completed, alphabetical)

### 🔧 Remaining Improvements

**High Priority:**
- [ ] Implement list sharing UI (backend API exists, needs UI)
- [ ] Add step reordering UI (drag-and-drop or buttons)
- [ ] Add pull-to-refresh on RemindersScreen
- [ ] Email verification flow improvements (resend verification, better messaging)

**Medium Priority:**
- [ ] Step edit functionality (edit descriptions)
- [ ] User profile editing
- [ ] Better error handling and user feedback

**Low Priority:**
- [ ] Offline support
- [ ] Advanced filters and views
- [ ] Accessibility improvements

## Troubleshooting

**Connection errors:**
- Make sure your backend is running
- Check that the API URL is correct
- For physical devices, ensure phone and computer are on the same network

**Module not found errors:**
- Delete `node_modules` and run `npm install` again
- Clear Expo cache: `npx expo start -c`

## Building for Production

### Store Submission

See [STORE_SUBMISSION.md](../instructions/MOBILE_APP_STORE_SUBMISSION.md) for detailed instructions on submitting to Google Play Store and Apple App Store.

### App Store Assets

See [STORE_LISTING.md](../instructions/MOBILE_APP_STORE_LISTING.md) for app description, keywords, and screenshot requirements.

## Privacy Policy

A privacy policy template is available in `privacy-policy.html`. You must host this file online and provide the URL when submitting to app stores.

**To host the privacy policy:**
1. Upload `privacy-policy.html` to a hosting service (GitHub Pages, your website, etc.)
2. Get the public URL
3. Update the email address in the privacy policy
4. Add the URL to your app store listings

## License

UNLICENSED








