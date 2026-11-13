---
name: react-native
description: Strict guidelines, architecture rules, and development standards for PaperKit Expo Go React Native development.
---

# PaperKit React Native Development Guidelines

PaperKit is an offline-capable, modern Android mobile application built with Expo (targeting 100% Expo Go compatibility) and styled with NativeWind v4 (Tailwind CSS).

## 1. Platform & Compatibility Rules
- **Target Platform**: Android running inside the **Expo Go** mobile application.
- **Expo Go Compatibility**: NEVER install or use libraries requiring custom native code, native build steps (`npx expo run:android` / EAS custom dev clients), or libraries that break Expo Go compatibility.
  - FORBIDDEN during Expo Go phase: `react-native-mmkv`, `react-native-google-mobile-ads`, or any library with custom C++/Java native code not bundled in Expo Go.
  - ALLOWED: Official Expo SDK modules (`expo-sqlite`, `expo-file-system`, `expo-document-picker`, `expo-image-picker`, `expo-image-manipulator`, `expo-sharing`, etc.) and pure JavaScript / SVG libraries compatible with Expo Go (`lucide-react-native`, `react-native-svg`).

## 2. Language & Typing Standards
- **TypeScript**: Always use TypeScript with strict typing enabled.
- **No `any`**: Strictly forbid `any` types. Define explicit interfaces, types, and generic parameters for props, database models, route params, and state.
- Keep components modular, reusable, and cleanly organized.

## 3. Styling Standards (NativeWind / Tailwind CSS)
- **NativeWind v4**: Use standard Tailwind CSS utility classes via the `className` attribute (`className="..."`) across all React Native primitives (`View`, `Text`, `Pressable`, `ScrollView`, `TextInput`, etc.).
- **Avoid `StyleSheet.create`**: Do NOT use `StyleSheet.create` or inline style objects unless strictly required by an unstyled third-party library or dynamic runtime calculations that cannot be represented as Tailwind classes.
- **Color Palette & Theme**: Consistent dark/light styling using Tailwind's slate/zinc palette (e.g., `bg-slate-900`, `text-slate-100`, `border-slate-800`).

## 4. Navigation & Architecture
- **Navigation**: Use file-based routing via `expo-router` under the `app/` directory.
- **Folder Structure**:
  - `app/`: Route pages, layouts, and screens managed by `expo-router`.
  - `components/`: Reusable UI components.
  - `db/`: Database migrations, schemas, connection helpers, and repository queries.
  - `utils/`: Helper functions, formatters, and utility functions.
  - `constants/`: Configuration, theme tokens, and app constants.
- **Layouts & Safe Areas**: Always wrap screen root containers with `SafeAreaView` from `react-native-safe-area-context` to handle Android status bars, notches, and navigation bars gracefully.
- **Touch-Friendly UI**: Design with modern mobile UX in mind—touch targets at least 44x44 dp, responsive spacing, clear visual feedback with `active:opacity-70` or `active:scale-95`.

## 5. Data Storage & Persistence
- **Relational Tables**: Use `expo-sqlite` (modern `useSQLiteContext` or `openDatabaseSync` / `openDatabaseAsync` APIs) for structured relational data.
- **Key-Value Settings**: Use `expo-sqlite/kv-store` for app preferences, flags, and key-value settings.
- Ensure database queries are properly indexed and error-handled.

