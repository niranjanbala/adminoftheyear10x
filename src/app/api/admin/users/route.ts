import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withCors } from '@/lib/auth-middleware'
import { adminService } from '@/lib/database'
import { z } from 'zod'

const userUpdateSchema = z.object({
  role: z.enum(['participant', 'voter', 'organizer', 'super_admin']).optional(),
  verification_status: z.enum(['pending', 'verified', 'rejected']).optional(),
  is_suspended: z.boolean().optional(),
  suspension_reason: z.string().optional()
})

async function getHandler(request: NextRequest, { user }: any) {
  try {
    const url = new URL(request.url)
    const searchParams = url.searchParams
    
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search')
    const role = searchParams.get('role')
    const verificationStatus = searchParams.get('verification_status')
    const suspended = searchParams.get('suspended')

    const users = await adminService.getUsers({
      limit,
      offset,
      search,
      role,
      verificationStatus,
      suspended: suspended === 'true' ? true : suspended === 'false' ? false : undefined
    })

    const totalCount = await adminService.getUserCount({
      search,
      role,
      verificationStatus,
      suspended: suspended === 'true' ? true : suspended === 'false' ? false : undefined
    })

    return NextResponse.json({
      users,
      pagination: {
        limit,
        offset,
        total: totalCount,
        has_more: offset + limit < totalCount
      }
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

async function putHandler(request: NextRequest, { user }: any) {
  try {
    const body = await request.json()
    const { user_id, ...updates } = body
    
    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const validatedData = userUpdateSchema.parse(updates)

    // Prevent self-modification of critical fields
    if (user_id === user.id) {
      if (validatedData.role && validatedData.role !== user.role) {
        return NextResponse.json(
          { error: 'Cannot modify your own role' },
          { status: 400 }
        )
      }
      if (validatedData.is_suspended) {
        return NextResponse.json(
          { error: 'Cannot suspend yourself' },
          { status: 400 }
        )
      }
    }

    const updatedUser = await adminService.updateUser(user_id, validatedData)

    return NextResponse.json({
      success: true,
      user: updatedUser
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.NEXT_PUBLIC_APP_URL!] 
    : ['http://localhost:3000'],
  methods: ['GET', 'PUT'],
}

export const GET = withCors(
  withAuth(getHandler, { requireRole: 'super_admin', requireVerified: true }),
  corsOptions
)

export const PUT = withCors(
  withAuth(putHandler, { requireRole: 'super_admin', requireVerified: true }),
  corsOptions
)