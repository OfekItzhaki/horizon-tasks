# How to View Console Logs in Expo

## Where to Find Console Logs

### 1. Metro Bundler Terminal (Main Location)
**This is where most logs appear!**

When you run `npx expo start`, the terminal window that opens shows all console logs:
- `console.log()` statements
- Errors and warnings
- Network requests
- API calls

**Look for:**
- The terminal where you ran `expo start` or `npm start`
- You should see logs appearing in real-time as you use the app

### 2. Expo Go App (Limited)
- Shake your device to open the developer menu
- Tap "Debug Remote JS" (if available)
- Some logs may appear in the Expo Go app itself

### 3. React Native Debugger (Advanced)
For more detailed debugging:
1. Install React Native Debugger
2. Enable remote debugging in Expo Go
3. Open React Native Debugger
4. View console logs there

### 4. Browser Console (Web Only)
If running on web (`npm run web`):
- Open browser DevTools (F12)
- Check the Console tab

## What You Should See

When saving a task with reminders, you should see logs like:

```
Saving reminders: { editRemindersCount: 2, ... }
Skipping EVERY_DAY reminder: 1234567890
Set weekly reminder: day 1 (reminder ID: 9876543210)
Final specificDayOfWeek: 1
Setting specificDayOfWeek in update: 1
```

## If You Don't See Logs

1. **Check the Metro bundler terminal** - This is the main place
2. **Make sure the app is connected** - Check if Metro shows "Connected"
3. **Restart Expo** - Sometimes logs don't appear until restart:
   ```bash
   # Stop Expo (Ctrl+C)
   npx expo start -c
   ```
4. **Check if logs are filtered** - Some terminals filter output

## Quick Test

Add this to any screen to test if logs are working:

```typescript
useEffect(() => {
  console.log('TEST LOG - If you see this, logs are working!');
}, []);
```

If you see "TEST LOG" in the Metro terminal, logs are working!
