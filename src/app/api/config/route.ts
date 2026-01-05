import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { decryptSensitiveFields } from '@/utils/crypto';

export const dynamic = 'force-dynamic';

const CONFIG_PATH = path.join(process.cwd(), 'config.yml');

interface GlobalConfig {
  integrations?: unknown[];
  permissions?: Record<string, string[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Read global config from YAML (integrations, permissions, etc.)
function getGlobalConfig(): GlobalConfig {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      // Create minimal global config
      const defaultConfig = {
        integrations: [],
        permissions: {
          // Default widget permissions
          netdata: ['admin'],
          glances: ['admin'],
          portainer: ['admin'],
          jellyfin: ['admin', 'member'],
          jellyseerr: ['admin', 'member'],
          qbittorrent: ['admin', 'member'],
          sabnzbd: ['admin', 'member'],
          clock: ['admin', 'member', 'viewer'],
          weather: ['admin', 'member', 'viewer'],
          calendar: ['admin', 'member', 'viewer'],
          rss: ['admin', 'member', 'viewer'],
          search: ['admin', 'member', 'viewer'],
          shortcut: ['admin', 'member', 'viewer'],
          image: ['admin', 'member', 'viewer'],
          spacer: ['admin', 'member', 'viewer'],
          twitch: ['admin', 'member', 'viewer'],
        },
        lastUpdated: new Date().toISOString(),
      };
      const yamlStr = yaml.dump(defaultConfig);
      fs.writeFileSync(CONFIG_PATH, yamlStr, 'utf8');
      return defaultConfig;
    }

    const fileContents = fs.readFileSync(CONFIG_PATH, 'utf8');
    const rawData = yaml.load(fileContents) as GlobalConfig;
    return decryptSensitiveFields(rawData) as GlobalConfig;
  } catch (error) {
    console.error('Error reading global config:', error);
    return { integrations: [], permissions: {} };
  }
}

// Default dashboard layout for new users
function createDefaultDashboardLayout() {
  const defaultPageId = uuidv4();
  return {
    widgets: [],
    scrollDirection: 'vertical',
    pages: [{ id: defaultPageId }],
    defaultPageId: defaultPageId,
    settings: {
      behavior: {
        confirmEdit: false,
        autoSave: true,
        refreshInterval: 10,
        autoDetectLocation: true,
      },
      display: {
        is24Hour: true,
        temperatureUnit: 'C',
        dateFormat: 'DD/MM',
        language: 'en',
        timezone: 'auto',
        location: '',
      },
      shortcuts: {
        toggleEdit: 'Alt+E',
        openSettings: 'Alt+,',
        addItem: 'Alt+N',
        saveChanges: 'Alt+S',
        prevPage: 'Alt+ArrowLeft',
        nextPage: 'Alt+ArrowRight',
      },
    },
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Get global config (integrations, permissions)
    const globalConfig = getGlobalConfig();

    // If no session, return global config only (for login page, etc.)
    if (!session?.user) {
      return NextResponse.json({
        ...createDefaultDashboardLayout(),
        integrations: globalConfig.integrations || [],
        permissions: globalConfig.permissions || {},
      });
    }

    const userId = session.user.id;

    // Get user's default dashboard from database
    let dashboard = await prisma.dashboard.findFirst({
      where: {
        userId,
        isDefault: true,
      },
    });

    // If no dashboard exists, create one
    if (!dashboard) {
      const defaultLayout = createDefaultDashboardLayout();
      dashboard = await prisma.dashboard.create({
        data: {
          userId,
          name: 'Main',
          layout: JSON.stringify(defaultLayout),
          isDefault: true,
        },
      });
    }

    // Parse the dashboard layout
    const dashboardData = JSON.parse(dashboard.layout);

    // Merge with global config
    return NextResponse.json({
      ...dashboardData,
      integrations: globalConfig.integrations || [],
      permissions: globalConfig.permissions || {},
      userRole: session.user.role,
    });
  } catch (error) {
    console.error('Error reading config:', error);
    return NextResponse.json(
      { error: 'Failed to read configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Viewers cannot save
    if (session.user.role === 'viewer') {
      return NextResponse.json({ error: 'Viewers cannot edit dashboards' }, { status: 403 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validate that we have widgets
    if (!body.widgets || !Array.isArray(body.widgets)) {
      console.error('Invalid configuration format: missing widgets array');
      return NextResponse.json(
        { error: 'Invalid configuration format' },
        { status: 400 }
      );
    }

    // Extract dashboard-specific data (not global config)
    const dashboardData = {
      widgets: body.widgets,
      pages: body.pages,
      scrollDirection: body.scrollDirection,
      defaultPageId: body.defaultPageId,
      settings: body.settings,
    };

    // Find or create user's default dashboard
    const existingDashboard = await prisma.dashboard.findFirst({
      where: {
        userId,
        isDefault: true,
      },
    });

    if (existingDashboard) {
      // Update existing dashboard
      await prisma.dashboard.update({
        where: { id: existingDashboard.id },
        data: {
          layout: JSON.stringify(dashboardData),
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new dashboard
      await prisma.dashboard.create({
        data: {
          userId,
          name: 'Main',
          layout: JSON.stringify(dashboardData),
          isDefault: true,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}
