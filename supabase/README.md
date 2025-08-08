# HubSpot Admin Competition - Database Setup

This directory contains the complete database schema and configuration for the HubSpot Admin Competition Platform.

## Database Schema Overview

### Core Tables

1. **users** - User profiles and authentication data
2. **competitions** - Competition definitions and metadata
3. **participations** - User participation in competitions
4. **votes** - Voting records with fraud prevention

### Storage Buckets

1. **profile-pictures** - User profile images
2. **banner-images** - User banner images  
3. **intro-videos** - User introduction videos
4. **submission-media** - Competition submission media

## Migration Files

### 001_initial_schema.sql
- Creates all core tables with proper relationships
- Defines custom enum types for consistent data
- Sets up indexes for optimal performance
- Includes automatic timestamp triggers

### 002_rls_policies.sql
- Implements Row Level Security (RLS) for data protection
- Defines granular access control policies
- Creates helper functions for vote counting and rankings
- Sets up real-time leaderboard functions

### 003_storage_setup.sql
- Creates storage buckets for media files
- Implements storage-level security policies
- Organizes files by user ID for security

### 004_helper_functions.sql
- Fraud prevention functions
- Competition management utilities
- Leaderboard and ranking calculations
- Trending participant analysis

## Key Features

### Security
- Row Level Security (RLS) on all tables
- User-based access control
- IP-based fraud prevention
- Rate limiting for votes

### Performance
- Optimized indexes on frequently queried columns
- Efficient ranking calculations
- Real-time subscription support

### Data Integrity
- Foreign key constraints
- Enum types for consistent values
- Automatic timestamp updates
- Unique constraints for vote prevention

## Database Functions

### Voting Functions
- `can_user_vote()` - Check if user can vote
- `check_duplicate_vote_attempt()` - Fraud prevention
- `get_user_voting_status()` - User's voting history

### Competition Functions
- `get_competition_leaderboard()` - Real-time rankings
- `calculate_competition_rankings()` - Update rankings
- `advance_competition_winners()` - Tier progression
- `get_competition_stats()` - Competition analytics

### Utility Functions
- `validate_competition_dates()` - Date validation
- `get_trending_participants()` - Trending analysis

## Setup Instructions

1. Install Supabase CLI
2. Initialize project: `supabase init`
3. Start local development: `supabase start`
4. Apply migrations: `supabase db reset`
5. Generate types: `supabase gen types typescript --local > src/lib/database.types.ts`

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Testing

The database schema includes comprehensive test coverage for:
- Service layer functions
- Type safety validation
- Security policy enforcement
- Performance optimization

Run tests with: `npm test`