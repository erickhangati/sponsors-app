import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import axios from 'axios';

export async function GET() {
  // No need for 'req' parameter
  // Get user session
  const session = await getServerSession(authOptions); // Do NOT pass 'req'

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch dashboard stats from FastAPI
    const { data } = await axios.get(
      `${process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL}/admin/dashboard`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
