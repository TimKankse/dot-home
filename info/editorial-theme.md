For this project, should I stay with Next JS, or should I move to a react frontend with a go backend?
This is the official design specification and technical documentation for **dotHome**. This document serves as the "source of truth" for the visual identity, interaction models, and architectural decisions of the project. The design language i laid out here I call "EditorialView", and it is a blend of the "Editorial" and "Industrial" aesthetics with inspiration from the "Nothing OS" aesthetic.

-----

# dotHome: Design System & Documentation

**Version:** 1.0.0 (Alpha)
**Status:** In Development

## 1\. The Manifesto

**dotHome** is a self-hosted "Personal Dashboard" for the web. It rejects the utility-only aesthetic of traditional dashboards (e.g., Homarr, Heimdall) in favor of a curated, magazine-like experience. The endgoal is to create a dashboard that is functional to such a degree that it could be the primary interface for handling daily tasks, managing *arr stack, monitoring system health, and managing docker containers.

Its important that the the project is built with modularity in mind. Widgets should be able to be added, removed, and configured without having to modify the core codebase. Widgets should be able to be created by the user, and should be able to be configured from within the dashboard.
The theme should be able to be changed by the user, and should be able to be configured from within the dashboard. With custom css.

It is built on the tension between two opposing aesthetics:

1.  **The Editorial (Human):** Represented by the *Gloock* serif font-elegant, bold, and expressive.
2.  **The Industrial (Machine):** Represented by the *Nothing OS* aesthetic-dot matrices, monospaced data, and raw monochrome high-contrast.

-----

## 2\. Design Pillars

### I. High Contrast, Low Noise

The interface is strictly monochrome with purposeful accents. We do not use color for decoration; we use it for **status** and **brand identity**. If an element is Red, it demands attention (Live, Error, Alert). If it is Green, it signifies health.

### II. The "Bento" Physics

The grid is not a static table. It is a collection of physical objects.

  * **Tactility:** Every widget must react to the cursor.
  * **Fluidity:** Layout changes, hovering, and loading states must animate smoothly (`bezier(0.25, 0.8, 0.25, 1)`).
  * **Cohesion:** All widgets share the same `32px` corner radius, creating a unified "soft tech" feel.

### III. Typography as UI

Text is not just for reading; it is a structural element. Large Serif headers replace traditional icons or borders to delineate sections.

-----

## 3\. Visual Language

### 3.1 Color Palette

The system relies on "Void Black" backgrounds to make content pop.

| Token | Hex / Value | Usage |
| :--- | :--- | :--- |
| `bg-app` | `#050505` | The infinite background. |
| `bg-surface` | `#0f0f0f` | Widget cards. |
| `fg-primary` | `#f5f5f5` | Main text, headers. |
| `fg-secondary` | `#a3a3a3` | Metadata, subtitles. |
| `accent-red` | `#eb0016` | **The Pulse.** Used for "Live", "Record", "Error". |
| `accent-green` | `#00e054` | Success, Download Complete, System OK. |

### 3.2 Typography

We use a tri-font system to separate concerns.

  * **Display:** `Gloock` (400 weight).
      * *Usage:* Clock, Widget Titles, Greetings, "Big Numbers."
      * *Why:* Brings the "Magazine" feel.
  * **Body:** `Inter` (Variable).
      * *Usage:* Lists, descriptions, standard UI text.
      * *Why:* Maximum legibility.
  * **Data:** `Space Mono` or `JetBrains Mono`.
      * *Usage:* IP addresses, download speeds, coordinates, coding notes.
      * *Why:* Brings the "Industrial/Terminal" feel.

### 3.3 Iconography

  * **Library:** Lucide React.
  * **Style:** Stroke width `2px` (Bold) or `1.5px` (Regular).
  * **Behavior:** Icons should ideally be monochromatic. Brand icons (Twitch Purple, YouTube Red, Facebook Blue, etc.) are permitted.

### 3.4 Texture

To prevent the black background from feeling "flat," a global texture is applied:

  * **Pattern:** Radial Gradient Dots.
  * **Spacing:** 24px grid.
  * **Color:** `#262626` (Subtle Grey).
  * **Opacity:** Low.

-----

## 4\. The Grid System (Bento)

Editorial OS uses a modular grid. The base unit is **1 Block**.

  * **Portrait:** 4 Columns wide.
  * **Landscape:** 9 Columns wide.

### Widget Sizes

Widget can be expandble, and should be responsive and support multiple modes; i.e. a card view and a list view. Different clock-faces etc.
Each widget need to define its own min and max width and height, and should be fully responsive within that range.
Widgets with 1:1 aspect ratio and are smaller than 1x1 are called "Shortcut-Widgets".
Widgets with 1:1 aspect ratio and are bigger than 1x1 are called "Box-Widgets".
Widgets with x:y aspect ratio where x > y are called "Banner-Widgets".
Widgets with x:y aspect ratio where y > x are called "Cover-Widgets".
No widgets have an aspect ratio of 1:1 and have x > 4 or y > 4.
The content of a widget should not overflow outside the viewport of the widget in the x-axis.

1.  **Apps (1x1):** Icons, Shortcuts, Toggles, Stat indicators.
2.  **Small (2x1):** Media Player, Twitch Live Card, Calendar Event.
3.  **Medium (2x2):** To-Do List, System Monitor, Email Inbox.
4.  **Large (3x1 or 4x1):** Search Bar, Banner, Stock Ticker.

-----

## 5\. Component Architecture

Each widget follows a strict anatomical structure to ensure consistency.

### 5.1 The Widget Wrapper

Every widget is wrapped in a `<Card>` component that handles:

  * Background color (`bg-surface`).
  * Border (`border-dim`).
  * Hover effects (Scale + Border Highlight).
  * Context Menu trigger (Right click for settings).

### 5.2 Anatomy of a Widget

```tsx
<WidgetWrapper>
  {/* Header: Optional. Uses Gloock or Mono depending on vibe */}
  <WidgetHeader icon={<Wifi />} title="Network" />
  
  {/* Body: The dynamic content */}
  <div className="flex-1">
     {/* Content goes here */}
  </div>
  
  {/* Footer: Metadata or Status */}
  <WidgetFooter>
     <span className="text-accent-green">Online</span>
  </WidgetFooter>
</WidgetWrapper>
```

-----

## 6\. Technical Stack & Implementation

### 6.1 Core Framework

  * **Frontend:** Next.js 15+ (App Router).
  * **Styling:** Next.js CSS modules + CSS Variables.
  * **State:** Zustand (Global store for layout editing and data caching).
  * **Motion:** Framer Motion (Complex layout transitions).

### 6.2 Data Fetching Strategy (The Proxy Pattern)

Since this is self-hosted, we cannot expose API keys to the client, and we must avoid CORS errors from services like Radarr/Sonarr.

1.  **Client:** Widget requests data from `/api/proxy/radarr`.
2.  **Server (Next.js API Route):**
      * Validates session.
      * Fetches data from `http://192.168.1.XX:7878/api/v3/...`.
      * Transforms data into a simplified JSON format for the UI.
      * Returns clean JSON to Client.

### 6.3 Configuration

Configuration is defined in a `config.yml` or JSON file (mapped via Docker volume), allowing easy backup and migration.

**Example `config.yml` structure:**

```yaml
theme: editorial

user:
  name: Admin
  city: Stockholm

layout:
  - id: clock
    x: 0
    y: 0
    w: 2
    h: 1
    type: clock

  - id: twitch
    x: 2
    y: 0
    w: 2
    h: 1
    type: twitch
    settings:
      channels:
        - kaicenat

services:
  radarr:
    url: http://10.0.0.5:7878
    apiKey: ENV_VAR

```

-----

## 7\. Integration Roadmap

This defines the specific features required for v1.0.

### High Priority

  * **Clock/Date:** Native feel with Gloock font.
  * **Weather:** OpenMeteo API (No key required).
  * **Search:** Google/DDG redirect + "Bang" support (e.g., `!yt`).
  * **Shortcuts:** Static links to LAN services (Portainer, PiHole) with icons either automatically detected or manually entered.
  * **Folders:** Group shortcuts into iOS/Smartphone-style folders.

### Media & Social

  * **Twitch/Kick:** Live status checker (Is user online? View count).
  * **Jellyfin:** "Now Playing" dashboard with pause/play control.
  * **YouTube:** RSS feed parsing for specific channels.
  * **Mpris / Spotify:** "Now Playing" dashboard with pause/play control.
  * **RSS:** RSS feed parsing for your own RSS feeds.

### System (\*arr stack)

  * **Radarr/Sonarr:** Calendar view or "Upcoming" list.
  * **Jellyseerr:** "Requested", "Approved", "Rejected" lists.
  * **Sabnzbd/Qbit:** Download speed meter and progress bar.

### Productivity

  * **Todo:** Simple local-storage list or Notion API integration.
  * **Mail:** (Don't know how to do this)
  * **Calendar:** iCal feed parser. Integrate with Radarr/Sonarr for upcoming media releases.
  * **Stocks:** Charts for stocks, currencies, crypto, etc.


-----

## 8\. Developer Rules (Contribution Guide)

1.  **No Magic Numbers:** All spacing, colors, and fonts must use Tailwind classes or CSS variables.
2.  **Error Gracefully:** If an API fails (e.g., Radarr is down), the widget should not crash the page. It should show a subtle "Offline" state (dimmed opacity, specific icon).
3.  **Keep it Fast:** Avoid heavy libraries. Use SVGs over images where possible.
