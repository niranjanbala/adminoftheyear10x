import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withCors } from '@/lib/auth-middleware'
import { userService } from '@/lib/database'
import { z } from 'zod'

const updateProfileSchema = z.object({
  display_name: z.string().min(2).max(50),
  bio: z.string().max(500).optional(),
  hubspot_experience: z.string().max(200).optional(),
  skills: z.array(z.string()).max(10),
  portfolio_links: z.array(z.string().url()).max(5),
  profile_picture_url: z.string().url().optional(),
  banner_image_url: z.string().url().optional(),
  intro_video_url: z.string().url().optional(),
})

async function getHandler(request: NextRequest, { user }: any) {
  try {
    const profile = await userService.getById(user.id)
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      hubspot_id: profile.hubspot_id,
      display_name: profile.display_name,
      role: profile.role,
      verification_status: profile.verification_status,
      bio: profile.bio,
      skills: profile.skills,
      hubspot_experience: profile.hubspot_experience,
      portfolio_links: profile.portfolio_links,
      profile_picture_url: profile.profile_picture_url,
      banner_image_url: profile.banner_image_url,
      intro_video_url: profile.intro_video_url,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

async function putHandler(request: NextRequest, { user }: any) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validatedData = updateProfileSchema.parse(body)
    
    // Update user profile
    const updatedProfile = await userService.update(user.id, {
      display_name: validatedData.display_name,
      bio: validatedData.bio || null,
      hubspot_experience: validatedData.hubspot_experience || null,
      skills: validatedData.skills,
      portfolio_links: validatedData.portfolio_links,
      profile_picture_url: validatedData.profile_picture_url || null,
      banner_image_url: validatedData.banner_image_url || null,
      intro_video_url: validatedData.intro_video_url || null,
    })

    return NextResponse.json({
      id: updatedProfile.id,
      email: updatedProfile.email,
      hubspot_id: updatedProfile.hubspot_id,
      display_name: updatedProfile.display_name,
      role: updatedProfile.role,
      verification_status: updatedProfile.verification_status,
      bio: updatedProfile.bio,
      skills: updatedProfile.skills,
      hubspot_experience: updatedProfile.hubspot_experience,
      portfolio_links: updatedProfile.portfolio_links,
      profile_picture_url: updatedProfile.profile_picture_url,
      banner_image_url: updatedProfile.banner_image_url,
      intro_video_url: updatedProfile.intro_video_url,
      created_at: updatedProfile.created_at,
      updated_at: updatedProfile.updated_at,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
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
  withAuth(getHandler, { requireVerified: false }),
  corsOptions
)

export const PUT = withCors(
  withAuth(putHandler, { requireVerified: false }),
  corsOptions
)