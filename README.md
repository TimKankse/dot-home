# Editorial OS

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Editorial OS** is a self-hosted personal dashboard that combines the elegance of editorial design with the precision of industrial data visualization. Built for homelab enthusiasts and power users who want a beautiful, functional interface for their self-hosted services.

![Editorial OS Screenshot](./public/screenshot.png)

## ✨ Features

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
git clone https://github.com/yourusername/editorial-os.git
cd editorial-os

# Copy example config
cp config.example.yml config.yml

# Start with Docker Compose
docker compose up -d
```

Access the dashboard at `http://localhost:3000`

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/editorial-os.git
cd editorial-os

# Install dependencies
npm install

# Copy example config
cp config.example.yml config.yml

# Start development server
npm run dev

# Or build for production
npm run build
npm start
```

## ⚙️ Configuration

All configuration is done through the web UI. Your settings are automatically saved to `config.yml`.

### First Launch
On first launch, Editorial OS creates a default `config.yml` with sensible defaults. Use the UI to:

1. **Add Integrations** (Settings → Integrations) — Configure your services with their URLs and API keys
2. **Add Widgets** (+ button) — Choose from available widget types
3. **Customize Layout** (Pencil icon) — Drag and resize widgets to your liking

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Alt + E` | Toggle edit mode |
| `Alt + ,` | Open settings |
| `Alt + N` | Add new widget |
| `Alt + S` | Save changes |
| `Alt + ←/→` | Navigate pages |

Shortcuts can be customized in Settings → Shortcuts.

## 🐳 Docker Configuration

### Docker Compose

```yaml
services:
  editorial-os:
    image: ghcr.io/yourusername/editorial-os:latest
    container_name: editorial-os
    restart: unless-stopped
    ports:
      - "9292:9292"
    volumes:
      - ./config.yml:/app/config.yml
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node environment |
| `PORT` | `9292` | Server port |

## 🎨 Themes

Editorial OS includes 8 carefully crafted themes:

- **Dark** (default) - High contrast dark theme
- **Light** - Clean light theme
- **Gruvbox** - Retro groove
- **Catppuccin** - Soothing pastel theme
- **Nord** - Arctic, bluish color palette
- **Tokyo Night** - A dark theme inspired by Tokyo city lights
- **Rose Pine** - All natural pine, faux fur, and a bit of soho vibes
- **Everforest** - Comfortable green theme

Change themes in Settings → Appearance.

## 🔧 Development

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
- **Language**: TypeScript

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. Its my first open source project, so I am still learning, and getting the hang of maintaining a github repository.

## Acknowledgments

- Design inspired by Nothing OS and homarr. And the current project are using icons directly compiled by the homarr team. 
- Icons from [Lucide](https://lucide.dev)
- Fonts: Gloock, Inter, Space Mono
