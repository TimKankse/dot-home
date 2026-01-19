# dotHome

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**dotHome** is a self-hosted personal dashboard that combines the elegance of editorial design with the precision of industrial data visualization. Built for homelab enthusiasts and power users who want a beautiful, functional interface for their self-hosted services.

## Features

### Dashboard
- **Bento Grid Layout** — Drag-and-drop widgets with fluid, responsive design
- **Multi-Page Support** — Organize widgets across multiple pages with scroll navigation
- **Keyboard Shortcuts** — Full keyboard navigation for power users
- **Theme Support** — 8 built-in themes (Dark, Light, Gruvbox, Catppuccin, Nord, Tokyo Night, Rose Pine, Everforest)

### Widgets
| Widget | Description |
|--------|-------------|
| **Clock** | Digital and analog variants with customizable formats |
| **Weather** | Current, daily, or weekly forecasts (Open-Meteo or OpenWeatherMap) |
| **Calendar** | iCal integration with Radarr/Sonarr upcoming releases |
| **Search** | Quick search with customizable search engines |
| **RSS** | Feed reader with thumbnail support |
| **Jellyfin** | Now Playing, Recently Added, and Libraries views |
| **Jellyseerr** | Pending requests with approve/reject actions |
| **Portainer** | Container status overview |
| **Netdata** | System metrics (CPU, RAM, Network, GPU, Storage) |
| **Twitch** | Live stream status for followed channels |
| **qBittorrent** | Download queue status |
| **SABnzbd** | Usenet download status |
| **Shortcuts** | Quick links to any service |
| **Image** | Display any image from URL |

### Integrations
Configure your services once, use them across multiple widgets:
- Jellyfin
- Radarr / Sonarr
- Portainer
- Netdata
- And more via Generic integration type

## Quick Start

### Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/TimKankse/dot-home.git
cd dot-home

# Start with Docker Compose
docker compose up -d
```

Access the dashboard at `http://localhost:9292`

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/TimKankse/dot-home.git
cd dot-home

# Install dependencies
npm install

# Start development server
npm run dev

# Or build for production
npm run build
npm start
```

## Configuration

All configuration is stored in a SQLite database. The web UI is the primary way to configure your dashboard.

### First Launch
On first launch, you'll be prompted to create an admin account. Once logged in, use the UI to:

1. **Add Integrations** (Settings > Integrations) — Configure your services with their URLs and API keys
2. **Add Widgets** (+ button) — Choose from available widget types
3. **Customize Layout** (Pencil icon) — Drag and resize widgets to your liking

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Alt + E` | Toggle edit mode |
| `Alt + ,` | Open settings |
| `Alt + N` | Add new widget |
| `Alt + S` | Save changes |
| `Alt + Left/Right` | Navigate pages |

Shortcuts can be customized in Settings > Shortcuts.

## Docker Configuration

### Docker Compose

```yaml
services:
  dot-home:
    image: ghcr.io/timkankse/dot-home:latest
    container_name: dot-home
    restart: unless-stopped
    ports:
      - "9292:9292"
    volumes:
      - ./data:/app/prisma
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node environment |
| `PORT` | `9292` | Server port |

## Themes

dotHome includes 8 carefully crafted themes:

- **Dark** (default) - High contrast dark theme
- **Light** - Clean light theme
- **Gruvbox** - Retro groove
- **Catppuccin** - Soothing pastel theme
- **Nord** - Arctic, bluish color palette
- **Tokyo Night** - A dark theme inspired by Tokyo city lights
- **Rose Pine** - All natural pine, faux fur, and a bit of soho vibes
- **Everforest** - Comfortable green theme

Change themes in Settings > Appearance.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run linting
npm run lint

# Build for production
npm run build
```

### Tech Stack
- **Framework**: Next.js 15+ (App Router)
- **Styling**: CSS Modules + CSS Variables
- **State**: Zustand
- **Grid**: GridStack
- **Database**: SQLite with Prisma
- **Language**: TypeScript

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. This is my first open source project, so I'm still learning and getting the hang of maintaining a GitHub repository.

## Acknowledgments

- Design inspired by Nothing OS and Homarr
- Icons compiled by the Homarr team
- Generative AI was used as a tool to generate code for the project. No AI was used to generate images or other graphic assets.
- Icons from [Lucide](https://lucide.dev)
- Fonts: Gloock, Inter, Space Mono
