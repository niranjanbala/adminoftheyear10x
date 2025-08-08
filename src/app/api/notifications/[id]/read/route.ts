import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withCors } from '@/lib/auth-middleware'
import { notificationService } from '@/lib/database'

async function postHandler(request: NextRequest, { user }: any) {
  try {
    const url = new URL(request.url)
    const notificationId = url.pathname.split('/')[3] // /api/notifications/[id]/read
    
    const notification = await notificationService.markAsRead(notificationId, user.id)
    
    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      notification
    })

  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
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