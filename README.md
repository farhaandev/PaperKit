# PaperKit 📄

> **100% Offline, Privacy-First PDF & Document Utility Toolkit for Android, built with React Native & Expo Go.**

PaperKit is a mobile document utility designed to process documents entirely on-device without cloud uploads, external servers, or tracking. Whether you need to compile camera photos into an A4 PDF or compress an ID image strictly under 200KB for government and job portal uploads, PaperKit handles it instantly and privately.

---

## 🚀 Build Progress Tracker: PaperKit

- [x] **Step 1:** Project Scaffold (`paperkit`) + Expo Go `SKILL.md`
- [x] **Step 2:** SQLite Database + Key-Value Store + Local File Manager
- [x] **Step 3:** Navigation Shell + Home Screen UI
- [x] **Step 4:** Tool 1 (Images → PDF) + Export Success/Share Screen
- [x] **Step 5:** Tool 2 (Compress Image to Target KB)
- [ ] **Step 6:** Tool 3 (Merge PDFs) *(Current)*
- [ ] **Step 7:** Tool 4 (E-Sign Document)
- [ ] **Step 8:** Polish, Loading States & Edge-Case Handling

---

## ✨ Features & Tools

### 1. 🖼️ Images to PDF (`/tools/images-to-pdf`)
- Multi-image selection from Gallery (`expo-image-picker`) or Camera.
- Visual thumbnail page list with drag-free reordering (**Move Up / Move Down**).
- **90° Page Rotation** via `expo-image-manipulator`.
- **Page Layout Modes:**
  - **A4 Standard:** Proportional scaling centered within standard A4 dimensions (`[595.28, 841.89]`).
  - **Fit to Image:** Direct canvas scaling fitted to photo dimensions with uniform margin padding.
- Multi-page compilation via pure JavaScript `pdf-lib` engine (100% Expo Go compatible).

### 2. 🗜️ Compress Image to Target KB (`/tools/compress`)
- **Smart Target-KB Mode (Portal Optimizer):**
  - Iterative binary/step-down search (max 6 iterations) adjusting JPEG compression quality (`0.90` down to `0.15`) and resolution ladder (`orig` $\rightarrow$ `1600px` $\rightarrow$ `1200px` $\rightarrow$ `900px` $\rightarrow$ `640px`).
  - Guarantees final size $\le$ target KB.
  - Preset quick chips: **50 KB**, **100 KB**, **200 KB**, and **500 KB** + custom KB numeric input.
  - Automatically remembers the user's preferred compression target in SQLite KV-store.
- **Manual Quality Mode:**
  - Stepper chips for quality (`90%`, `75%`, `50%`, `30%`, `15%`) and max resolution limits (`Original`, `1600px`, `1080px`, `720px`).
- **Live Before/After Preview Card:**
  - Real-time thumbnail preview, original vs compressed size in bytes, resolution dimensions, and estimated percentage savings (`-XX% Saved`).
- **Dual Export Formats:**
  - **Save as JPG:** Saves compressed `.jpg` directly to app exports.
  - **Save as PDF:** Wraps the exact compressed JPEG into a single-page PDF with `pdf-lib` in one tap (ideal for job and admission portals requiring compressed PDFs).

### 3. 📑 Merge PDFs (`/tools/merge-pdf`) *(In Progress)*
- Select multiple existing PDFs and merge them into a single organized document.

### 4. ✍️ E-Sign PDF (`/tools/e-sign`) *(Upcoming)*
- Touch signature pad to create, save, and stamp transparent signatures onto document pages.

### 5. 🚀 Export & Save Hub (`/export-success`)
- Immediate visual confirmation with tool badges and format indicators (**JPG** / **PDF**).
- Inline file renaming with automatic extension preservation.
- **Android Storage Access Framework (SAF):** Pick any device folder (like **Downloads**) and save directly with native permission prompts.
- Native sharing sheet integration (`expo-sharing`).

### 6. 🗄️ Offline Persistence Vault
- **Relational Storage (`expo-sqlite`):** Single-connection SQLite database tracking all recent files with `title`, `file_uri`, `size_bytes`, `mime_type`, `tool_type`, and `created_at`.
- **Key-Value Store (`expo-sqlite/kv-store`):** Remembers user preferences (`savedSignatureUri`, `defaultCompressionKb`, `exportCounter`).
- **App Storage Directory (`expo-file-system`):** Scoped directory structure for permanent exported documents and signatures.

---

## 🛠️ Architecture & Tech Stack

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Expo SDK 58 (React Native 0.88, React 19) | Modern Android mobile runtime running 100% in Expo Go |
| **Routing** | Expo Router v58 | Type-safe file-based navigation |
| **Styling** | NativeWind v4 + Tailwind CSS | Fast utility-first styling with zero runtime stylesheet overhead |
| **PDF Engine** | `pdf-lib` | Pure JavaScript PDF creation, embedding, and manipulation |
| **Image Processing** | `expo-image-manipulator` | JPEG conversion, resizing, and rotation |
| **Database** | `expo-sqlite` | Local relational SQLite database with WAL mode |
| **Settings** | `expo-sqlite/kv-store` | Key-value settings persistence |
| **Sharing** | `expo-sharing` | Native Android share sheet |
| **Icons** | `lucide-react-native` | Clean, lightweight SVG icon system |

---

## 📂 Project Structure

```text
PaperKit/
├── app/
│   ├── _layout.tsx              # Root Stack navigation & DB boot sequence
│   ├── index.tsx                # Production Home Screen (2x2 tools grid & recent files)
│   ├── export-success.tsx       # Export complete screen (SAF download, share, rename)
│   └── tools/
│       ├── images-to-pdf.tsx    # Tool 1: Multi-image to PDF compiler
│       ├── compress.tsx         # Tool 2: Target-KB image compressor
│       ├── merge-pdf.tsx        # Tool 3: PDF merger (current)
│       └── e-sign.tsx           # Tool 4: Document signature pad
├── components/
│   ├── ToolCard.tsx             # Home screen interactive tool card
│   ├── RecentFileItem.tsx       # Saved file row with share & delete actions
│   ├── EmptyRecentState.tsx     # Clean placeholder when no files exist
│   └── AdBannerPlaceholder.tsx  # Reserved space placeholder for future ad banner
├── db/
│   ├── database.ts              # SQLite database singleton & CRUD functions
│   ├── settings.ts              # KV-store settings (default KB, export counter)
│   └── schema.ts                # Table creation pragmas & indexes
├── utils/
│   ├── fileManager.ts           # App directory paths, safe filenames, byte formatting
│   ├── pdfEngine.ts             # PDF compilation engine using pdf-lib
│   └── compressEngine.ts        # Deterministic target-KB compression loop
└── constants/
    └── types.ts                 # Strict TypeScript types (ToolType, RecentFile, etc.)
```

---

## 💻 Development Commands

```bash
# Install dependencies
npm install

# Start development server
npx expo start
# or
npm run dev

# Run TypeScript type check
npx tsc --noEmit

# Run ESLint
npx eslint app db components utils constants
```

---

## 📜 Development Rules & Compatibility

- **Expo Go Only:** Zero native modules outside Expo Go's bundled runtime.
- **Strict TypeScript:** No `any` types; all parameters and responses are explicitly typed.
- **NativeWind Utility Styling:** Standard Tailwind utility classes (`className="..."`) with native touch feedback.
- **Safe Area Insets:** Dynamic bottom padding on Android to guarantee clearance above the 3-button system navigation bar.
