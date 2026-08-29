# NWSDB Field Operations - Expo React Native

This is the cross-platform field-officer client for Android and iOS. It runs in Expo Go during development and uses the existing Node.js API in `../server`.

## Included officer features

- Secure field-officer login and session restoration
- Assigned complaint list, status filters, and pull-to-refresh
- Complaint details, citizen call action, and Google Maps navigation
- Required workflow: `Assigned -> Reached -> In Progress -> Resolved`
- GPS position recorded when the officer marks a complaint as reached
- Resolution notes and camera/gallery completion photograph
- SQLite offline action queue with durable photograph storage
- Pending-sync badge and manual synchronization

## Prerequisites

- Node.js 22.13 or newer
- Expo Go installed from the Apple App Store or Google Play Store
- The PC and physical phone connected to the same trusted Wi-Fi network
- MongoDB and the project API running on the PC

## Run on an iPhone or physical Android phone

1. Start MongoDB and the backend from the project root:

   ```powershell
   docker compose up -d mongodb
   cd server
   npm install
   npm run seed
   npm run dev
   ```

2. Run `ipconfig` and copy the PC's active Wi-Fi/Ethernet IPv4 address. Do not use the WSL, Docker, default-gateway, or disconnected-adapter address.

3. On the phone, open the following address in Safari or Chrome, replacing the example IP:

   ```text
   http://192.168.1.20:5000/api/health
   ```

   Continue only when the phone displays JSON containing `"status":"ok"`.

4. Open a second PowerShell window in `mobile-expo`:

   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```

5. Change `.env` to the PC's real IPv4 address:

   ```env
   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:5000/api
   ```

6. Install and start the application:

   ```powershell
   npm install
   npx expo start -c
   ```

7. Open Expo Go and scan the QR code shown in the terminal/browser. Keep the API terminal and Expo terminal running.

8. Sign in with `officer1@nwsdb.lk` and `Officer@123`.

If Windows asks whether Node.js may communicate through the firewall, allow it on **Private networks**. Port `5000` must also be allowed for the API.

## Run on an Android Studio emulator

Set `.env` to:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5000/api
```

Start the emulator, then run:

```powershell
npx expo start -c --android
```

`10.0.2.2` is the Android Studio emulator's address for the host PC. Do not use it on a physical phone or iPhone.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| QR code opens but the project does not load | Confirm PC and phone are on the same Wi-Fi, allow Node.js through the Private firewall, and run `npx expo start -c` again. |
| Login says the server cannot be reached | Open the `/api/health` address on the phone. Correct the IP in `.env`, then restart Expo with `-c`. |
| Expo Go reports an SDK mismatch | Run `npm install`, then restart with `npx expo start -c`. This project intentionally uses Expo SDK 54 to match the App Store and Google Play Expo Go builds. |
| No assigned complaints appear | Run `npm run seed`, login as Officer 1, and ensure a complaint is assigned to that officer in the web dashboard. |
| Reached action fails | Enable location services and grant foreground location permission. |
| Resolved action fails | Enter resolution notes and capture/select a completion photograph under 8 MB. |
| An offline action remains pending | Restore connectivity, confirm the API health URL works, then press the sync icon on the home screen. |

## Verification

```powershell
npm run typecheck
npx expo-doctor
```

Expo Go is ideal for development and demonstrations. Use an Expo development build/EAS Build before App Store or production distribution.
