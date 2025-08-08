import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withCors } from '@/lib/auth-middleware'
import { notificationService } from '@/lib/database'

async function postHandler(request: NextRequest, { user }: any) {
  try {
    const notifications = await notificationService.markAllAsRead(user.id)
    
    return NextResponse.json({
      success: true,
      updated_count: notifications.length
    })

  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    )
  }
}

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.NEXT_PUBLIC_APP_URL!] 
    : ['http://localhost:3000'],
  methods: ['POST'],
}

export const POST = withCors(
  withAuth(postHandler, { requireVerified: false }),
  corsOptions
)