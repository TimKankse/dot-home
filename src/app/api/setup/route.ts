import { NextResponse } from 'next/server';
import { verifyBootstrapSecret } from '@/lib/bootstrap-security';
import { createInitialAdmin } from '@/lib/bootstrap-state';
import {
  createStarterDashboardLayout,
  serializeDashboardLayout,
} from '@/lib/dashboard-layout';
import { hashPassword, isValidPasswordLength, normalizeEmail } from '@/lib/passwords';
import { parseSetupRequest } from '@/lib/request-parsers';
import { ValidationError } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const { email, displayName, password, bootstrapSecret } = parseSetupRequest(await request.json());

    if (!verifyBootstrapSecret(bootstrapSecret)) {
      return NextResponse.json(
        { error: 'Invalid bootstrap secret' },
        { status: 403 },
      );
    }

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (!isValidPasswordLength(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    const user = await createInitialAdmin({
      email: normalizeEmail(email),
      displayName: displayName || null,
      passwordHash,
      dashboardLayout: serializeDashboardLayout(createStarterDashboardLayout()),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Setup already completed' },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Error during setup:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
