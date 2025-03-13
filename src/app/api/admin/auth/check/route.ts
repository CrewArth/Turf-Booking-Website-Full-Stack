import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();
  const adminToken = cookieStore.get('admin_token');

  return NextResponse.json({
    isAdmin: !!adminToken?.value,
  });
} 