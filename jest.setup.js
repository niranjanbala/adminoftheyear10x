import '@testing-library/jest-dom'

// Mock fetch globally
global.fetch = jest.fn()

// Mock Request and Response for API tests
global.Request = jest.fn().mockImplementation((url, options) => ({
  url,
  method: options?.method || 'GET',
  headers: new Headers(options?.headers),
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(''),
}))

global.Response = jest.fn().mockImplementation((body, options) => ({
  ok: options?.status ? options.status < 400 : true,
  status: options?.status || 200,
  json: jest.fn().mockResolvedValue(body),
  text: jest.fn().mockResolvedValue(body),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))

// Mock Supabase client will be done in individual test files as needed

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'