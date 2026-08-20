# MediAI Mobile — Phase 1 Scaffold

This is the auth + role-based navigation shell described in `MediAI_System_Architecture.md`.
It's runnable today. Every screen beyond Login/Register/Home/Profile is an intentional
placeholder to be filled in per the build order.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and set your real backend URL:
   ```
   EXPO_PUBLIC_API_URL=https://your-backend.onrender.com
   ```
   Never commit `.env` — it's already in `.gitignore`.
3. `npx expo start` — scan the QR with **Expo Go** for now.

   Once you add `react-native-webrtc` for video consults (build order step 6), you'll need a
   custom dev client via `eas build --profile development`, since WebRTC native modules aren't
   supported in plain Expo Go. Everything up to that point works fine in Expo Go.

## What's wired up and testable right now

- Login → calls your real `POST /api/auth/login`
  (⚠️ confirm response shape matches `{ token, user: { role, name, ... } }` in `api/auth.js` —
  adjust the destructuring in `screens/auth/LoginScreen.js` if your backend returns something else)
- Register → calls `POST /api/auth/register`
- JWT stored in `expo-secure-store`, auto-loaded on app boot (`store/authStore.js`)
- Role-based routing: `user` / `doctor` / `admin` / `super_admin` each land on their own
  navigator (`navigation/RootNavigator.js`) — confirm your backend's exact role string values
- Logout works from Home/Profile screens in every role, round-tripping back to AuthStack
- Emergency Scan screen (public, pre-login, reachable from the Login screen) — camera capture
  wired to `POST /api/emergency/scan` (⚠️ confirm the multipart field name and response shape
  against your `emergency.routes.js`)

## What's stubbed (placeholders only)

Doctors search/booking, Symptom Checker, OCR Scanner, Medicine Reminders/Orders, Reports,
Chat, Video Consult, Admin panel content, Super Admin panel content. Each placeholder screen
names which build-order phase it belongs to (see `MediAI_System_Architecture.md` section 8).

## API modules already scaffolded (not yet wired into UI)

`api/doctors.js`, `api/appointments.js`, `api/ai.js`, `api/reports.js`, `api/medicines.js`,
`api/emergency.js`, `api/chats.js`, plus `realtime/socket.js` for the Socket.io/WebRTC layer.
Every function has a `// NOTE:` comment where the exact payload shape needs confirming against
your actual controllers.

## Next steps (per build order)

1. Wire Doctors + Appointments screens to real data
2. Wire Symptom Checker to `/api/ai`
3. Build OCR Scanner (camera capture → upload → **editable confirmation screen**, don't
   auto-save extracted OCR data)
4. Text chat via Socket.io (`realtime/socket.js` already has the connection helper)
5. Video consult via `react-native-webrtc` — hardest piece, isolate it, test on physical
   devices, the signaling events in `realtime/socket.js` already match your server exactly
6. Doctor report review/approval screens — make the pending-vs-approved state visually obvious
7. Admin / Super Admin — decide if these should even ship on mobile, or stay web-only

## Before shipping anywhere real

Every credential in your original `.env` upload should already be rotated. Also: anything in
`app.config.js`'s `extra` block (like `EXPO_PUBLIC_API_URL`) ships inside the compiled app —
readable by anyone who extracts it. Never put real secrets there, only public URLs.
"# MediAi-Frontend" 
