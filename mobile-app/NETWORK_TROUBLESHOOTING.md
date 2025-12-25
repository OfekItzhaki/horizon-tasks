# Network Error Troubleshooting Guide

## Quick Fixes (Try These First)

### 1. Update Your IP Address
Your current IP address is: **192.168.68.55**

**Option A: Update .env file (Recommended)**
1. Open `mobile-app/.env` file
2. Set: `EXPO_PUBLIC_API_URL=http://192.168.68.55:3000`
3. Restart Expo with cache clear: `npx expo start -c`

**Option B: Update api.ts directly**
The fallback IP has been updated to `192.168.68.55`, but using .env is better.

### 2. Verify Backend is Running
```bash
cd todo-backend
npm run start:dev
```

You should see:
```
Application is running on: http://localhost:3000
```

### 3. Test Backend in Browser
Open: `http://192.168.68.55:3000/api`
- Should show Swagger documentation
- If this doesn't work, the backend isn't accessible from your network

### 4. Check Same Network
- Your phone and computer must be on the **same Wi-Fi network**
- Check your phone's Wi-Fi settings to confirm

### 5. Check Windows Firewall
1. Open Windows Defender Firewall
2. Allow Node.js through firewall
3. Or temporarily disable firewall for testing

### 6. Restart Everything
```bash
# Stop Expo (Ctrl+C)
# Stop Backend (Ctrl+C)

# Restart Backend
cd todo-backend
npm run start:dev

# In a new terminal, restart Expo
cd mobile-app
npx expo start -c
```

## Common Issues

### Issue: "Network error: Cannot reach server"
**Causes:**
- Wrong IP address in config
- Backend not running
- Firewall blocking connection
- Different networks

**Solution:**
1. Verify IP: Run `ipconfig` and check IPv4 Address
2. Update `.env` file with correct IP
3. Restart Expo with `-c` flag to clear cache

### Issue: "CORS error" or "Blocked by CORS policy"
**Solution:**
The backend needs CORS enabled. Check if `app.enableCors()` is in `main.ts`

### Issue: Works on simulator but not physical device
**Solution:**
- Simulators can use `localhost`
- Physical devices MUST use your computer's IP address
- Make sure you're using `192.168.68.55:3000` (not localhost)

### Issue: IP address keeps changing
**Solution:**
- Some routers assign dynamic IPs
- Consider setting a static IP for your computer
- Or update `.env` file each time IP changes

## Verify Configuration

After updating, check the Expo console. You should see:
```
API Base URL: http://192.168.68.55:3000
```

If you see this, the configuration is correct!

## Still Not Working?

1. **Check Expo console logs** - Look for the API Base URL message
2. **Check backend logs** - See if requests are reaching the server
3. **Try different network** - Some networks block device-to-device communication
4. **Use mobile hotspot** - Create a hotspot from your phone and connect computer to it
5. **Check backend port** - Verify backend is running on port 3000

## Testing Connection

From your phone's browser (on same Wi-Fi), try:
```
http://192.168.68.55:3000/api
```

If this works, the network is fine and it's an app configuration issue.
If this doesn't work, it's a network/firewall issue.
