## Front-end Setup Documentation & Resources

- **React** 19.2.0
- **Next.js** 15.5.4 (App Router)
- **Material UI** 7.3.4
- **TypeScript** 5.9
- **TanStack Query** 5.x (React Query) - State Management
- **Axios** (API Client)

### State Management

This project uses **TanStack Query (React Query)** for server state management, providing:

- Automatic background refetching
- Smart caching with configurable stale times
- Optimistic updates
- Query key management for cache invalidation
- Better performance with selective subscriptions
- Powerful data synchronization

### Data Fetching & Caching

TanStack Query handles all server state, including:

- Authentication state
- User profile data
- API data caching
- Request deduplication

**Available Hooks:**

- `useLoginMutation` - Login with TanStack Query
- `useLogoutMutation` - Logout with TanStack Query
- `useProfileQuery` - Fetch profile data
- `useUpdateProfileMutation` - Update profile

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/             # Shared UI components
├── features/               # Feature-based modules
│   ├── auth/              # Authentication
│   │   ├── hooks/        # TanStack Query hooks
│   │   └── components/   # Auth components
│   └── profile/           # User profile
│       ├── hooks/        # TanStack Query hooks
│       └── components/   # Profile components
├── lib/                    # Utilities & API client
└── styles/                 # Global styles & theme
```

### Getting Started

1. Install dependencies with `npm install`
2. Disable next.js telemetry `npx next telemetry disable`
3. Start app with `npm run dev`

If getting errors with husky on Linux, try: `sed -i 's/\r$//' .husky/pre-commit`