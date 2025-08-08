'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { storageService } from '@/lib/database'
import { cn } from '@/lib/utils'

interface MediaUploadProps {
  type: 'image' | 'video'
  bucket: string
  path: string
  onUpload: (url: string | null) => void
  maxSize?: number
  accept?: string
  className?: string
  currentUrl?: string
}

export function MediaUpload({
  type,
  bucket,
  path,
  onUpload,
  maxSize = 10 * 1024 * 1024, // 10MB default
  accept,
  className,
  currentUrl
}: MediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl || null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`)
      return
    }

    // Validate file type
    if (type === 'image' && !file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (type === 'video' && !file.type.startsWith('video/')) {
      setError('Please select a video file')
      return
    }

    try {
      setIsUploading(true)

      // Create preview
      const previewUrl = URL.createObjectURL(file)
      setPreview(previewUrl)

      // Upload file via API
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', bucket)
      formData.append('path', path)

      const response = await fetch('/api/users/media/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const { url } = await response.json()
      onUpload(url)
    } catch (error) {
      console.error('Upload error:', error)
      setError('Failed to upload file. Please try again.')
      setPreview(null)
      onUpload(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = async () => {
    try {
      setPreview(null)
      onUpload(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Remove error:', error)
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className={cn(
        "border-2 border-dashed border-muted-foreground/25 rounded-lg overflow-hidden",
        className
      )}>
        {preview ? (
          <div className="relative group">
            {type === 'image' ? (
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={preview}
                className="w-full h-full object-cover"
                controls
              />
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={triggerFileSelect}
                  disabled={isUploading}
                >
                  Change
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={isUploading}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-4">
              {type === 'image' ? (
                <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {type === 'image' ? 'Upload an image' : 'Upload a video'}
            </p>
            <Button
              variant="outline"
              onClick={triggerFileSelect}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Choose File'}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <p className="text-xs text-muted-foreground">
        Max size: {Math.round(maxSize / (1024 * 1024))}MB
      </p>
    </div>
  )
}