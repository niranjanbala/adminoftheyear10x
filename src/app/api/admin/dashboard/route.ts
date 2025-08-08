import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withCors } from '@/lib/auth-middleware'
import { adminService } from '@/lib/database'

async function getHandler(request: NextRequest, { user }: any) {
  try {
    // Get dashboard statistics
    const stats = await adminService.getDashboardStats()
    
    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error fetching admin dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.NEXT_PUBLIC_APP_URL!] 
    : ['http://localhost:3000'],
  methods: ['GET'],
}

export const GET = withCors(
  withAuth(getHandler, { requireRole: 'super_admin', requireVerified: true }),
  corsOptions
)