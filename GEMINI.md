# Editorial OS (dot-home)

## Project Overview
**Editorial OS** is a self-hosted "Personal Dashboard" for the web, built with **Next.js**. It aims to provide a curated, magazine-like experience ("Editorial" aesthetic) contrasted with raw, monospaced data ("Industrial" aesthetic).

The goal is to serve as a primary interface for daily tasks, media server management (*arr stack), and system monitoring.

**Key Architectural Concepts:**
-   **Framework**: Next.js 15+ (App Router).
-   **Styling**: CSS Modules + CSS Variables.
-   **State**: Zustand (planned).
-   **Data Fetching**: Proxy pattern via Next.js API routes to secure local API keys.
-   **Configuration**: `config.yml` (planned) for layout and service settings.

## Building and Running

### Prerequisites
-   Node.js (version matching `@types/node` ^20)
-   npm, yarn, pnpm, or bun

### Commands
-   **Development Server**:
    ```bash
    npm run dev
    ```
    Runs locally at `http://localhost:3000`.

-   **Build for Production**:
    ```bash
    npm run build
    ```

-   **Start Production Server**:
    ```bash
    npm run start
    ```

-   **Linting**:
    ```bash
    npm run lint
    ```

## Development Conventions

### Design Pillars
1.  **High Contrast, Low Noise**: Monochrome with purposeful accents (Red for alert/live, Green for health).
2.  **"Bento" Physics**: Tactile, fluid grid system with consistent `32px` corner radii.
3.  **Typography as UI**:
    -   **Display**: `Gloock` (Serif) for titles/greetings.
    -   **Body**: `Inter` for standard text.
    -   **Data**: `Space Mono` or `JetBrains Mono` for technical data.

### Component Architecture
-   **Widgets**: All widgets are wrapped in a `<WidgetWrapper>` component handling background, border, and hover effects.
-   **Graceful Failure**: Widgets must handle API failures gracefully (e.g., "Offline" state) without crashing the app.
-   **Performance**: Prefer SVGs over images; avoid heavy libraries.

### Directory Structure
-   `src/app/`: App Router pages and layouts.
-   `info/`: Design specifications and documentation.
-   `public/`: Static assets.
