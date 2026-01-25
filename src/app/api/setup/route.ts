import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/db';
import { getDefaultDashboardLayout } from '@/constants/default-dashboard';

const SALT_ROUNDS = 12;

export async function POST(request: Request) {
  try {
    // Check if any users already exist
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      return NextResponse.json(
        { error: 'Setup already completed' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, displayName, password } = body;

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

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        displayName: displayName || null,
        passwordHash,
        role: 'admin', // First user is always admin
      },
    });

    // Create a default empty dashboard for the user
    await prisma.dashboard.create({
      data: {
        userId: user.id,
        name: 'Main',
        layout: JSON.stringify(getDefaultDashboardLayout()),
        isDefault: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error during setup:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
