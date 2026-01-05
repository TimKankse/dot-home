import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import { encryptSensitiveFields, decryptSensitiveFields } from '@/utils/crypto';

export const dynamic = 'force-dynamic';

const CONFIG_PATH = path.join(process.cwd(), 'config.yml');

// Default configuration for first-time users
function createDefaultConfig() {
  const defaultPageId = uuidv4();
  return {
    widgets: [],
    scrollDirection: 'vertical',
    pages: [{ id: defaultPageId }],
    defaultPageId: defaultPageId,
    integrations: [],
    settings: {
      behavior: {
        confirmEdit: false,
        autoSave: true,
        refreshInterval: 10,
        autoDetectLocation: true
      },
      display: {
        is24Hour: true,
        temperatureUnit: 'C',
        dateFormat: 'DD/MM',
        language: 'en',
        timezone: 'auto',
        location: ''
      },
      shortcuts: {
        toggleEdit: 'Alt+E',
        openSettings: 'Alt+,',
        addItem: 'Alt+N',
        saveChanges: 'Alt+S',
        prevPage: 'Alt+ArrowLeft',
        nextPage: 'Alt+ArrowRight'
      }
    },
    lastUpdated: new Date().toISOString()
  };
}

export async function GET() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      // First boot: create default config
      const defaultConfig = createDefaultConfig();
      const yamlStr = yaml.dump(defaultConfig);
      fs.writeFileSync(CONFIG_PATH, yamlStr, 'utf8');
      console.log('Created default config.yml for first-time setup');
      return NextResponse.json(defaultConfig, { status: 200 });
    }

    const fileContents = fs.readFileSync(CONFIG_PATH, 'utf8');
    const rawData = yaml.load(fileContents) as Record<string, unknown>;
    
    // Decrypt sensitive fields before sending to client
    const data = decryptSensitiveFields(rawData);
    
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error reading config.yml:', error);
    return NextResponse.json({ error: 'Failed to read configuration' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate that we have widgets
    if (!body.widgets || !Array.isArray(body.widgets)) {
      console.error('Invalid configuration format: missing widgets array');
      return NextResponse.json({ error: 'Invalid configuration format' }, { status: 400 });
    }

    // Encrypt sensitive fields before saving
    const encryptedConfig = encryptSensitiveFields({
      ...body,
      lastUpdated: new Date().toISOString()
    });
    
    const yamlStr = yaml.dump(encryptedConfig);
    fs.writeFileSync(CONFIG_PATH, yamlStr, 'utf8');

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error writing config.yml:', error);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}

