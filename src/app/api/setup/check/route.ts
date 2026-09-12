import { NextResponse } from 'next/server';
import { getSetupState } from '@/lib/bootstrap-state';

export async function GET() {
  try {
    const state = await getSetupState();
    return NextResponse.json(state);
  } catch (error) {
    console.error('Error checking setup status:', error);
    return NextResponse.json(
      { error: 'Failed to check setup status' },
      { status: 500 }
    );
  }
}
