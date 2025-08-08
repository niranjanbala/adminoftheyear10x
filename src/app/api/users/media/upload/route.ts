import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withCors, withRateLimit } from '@/lib/auth-middleware'
import { storageService } from '@/lib/database'

async function handler(request: NextRequest, { user }: any) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string
    const path = formData.get('path') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!bucket || !path) {
      return NextResponse.json(
        { error: 'Bucket and path are required' },
        { status: 400 }
      )
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum 50MB allowed.' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg']
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images and videos are allowed.' },
        { status: 400 }
      )
    }

    // Validate bucket
    const allowedBuckets = ['profile-pictures', 'banner-images', 'intro-videos', 'submission-media']
    if (!allowedBuckets.includes(bucket)) {
      return NextResponse.json(
        { error: 'Invalid bucket' },
        { status: 400 }
      )
    }

    // Ensure path starts with user ID for security
    if (!path.startsWith(user.id)) {
      return NextResponse.json(
        { error: 'Invalid path. Must start with user ID.' },
        { status: 403 }
      )
    }

    // Upload file
    const uploadPath = `${path}-${Date.now()}.${file.name.split('.').pop()}`
    const publicUrl = await storageService.uploadFile(bucket, uploadPath, file, {
      cacheControl: '3600',
      upsert: true
    })

    return NextResponse.json({
      url: publicUrl,
      path: uploadPath,
      size: file.size,
      type: file.type
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
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
  withRateLimit(
    withAuth(handler, { requireVerified: false }),
    {
      maxRequests: 10,
      windowMs: 60 * 1000, // 1 minute
      keyGenerator: (req) => req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous'
    }
  ),
  corsOptions
)