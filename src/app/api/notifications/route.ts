import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withCors } from '@/lib/auth-middleware'
import { notificationService } from '@/lib/database'

async function getHandler(request: NextRequest, { user }: any) {
  try {
    const url = new URL(request.url)
    const searchParams = url.searchParams
    
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unread_only') === 'true'
    const type = searchParams.get('type')

    const notifications = await notificationService.getUserNotifications(user.id, {
      limit,
      offset,
      unreadOnly,
      type
    })

    const unreadCount = await notificationService.getUnreadCount(user.id)

    return NextResponse.json({
      notifications,
      unread_count: unreadCount,
      pagination: {
        limit,
        offset,
        has_more: notifications.length === limit
      }
    })

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
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
  withAuth(getHandler, { requireVerified: false }),
  corsOptions
)