import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcrypt';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

const SALT_ROUNDS = 12;

// GET /api/users - List all users (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user (admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, displayName, password, role = 'member' } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        displayName: displayName || null,
        passwordHash,
        role,
      },
    });

    // Create a default empty dashboard for the user
    await prisma.dashboard.create({
      data: {
        userId: user.id,
        name: 'Main',
        layout: JSON.stringify({
          widgets: [],
          pages: [{ id: 'default-page' }],
          scrollDirection: 'vertical',
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
        }),
        isDefault: true,
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
