# Poker Bankroll Tracker

A modern poker bankroll tracking application built with React Native, Expo, and Supabase. Track your poker sessions, analyze your performance, and manage your bankroll across different game types and variants.

## Tech Stack

- **Frontend**: React Native + Expo (Web-first)
- **UI Framework**: React Native Paper (Material Design)
- **Backend**: Supabase (PostgreSQL)
- **State Management**: TanStack React Query + Context API
- **Charts**: Victory Native
- **Deployment**: Netlify
- **Language**: TypeScript

## Features

- **Session Tracking**: Log poker sessions with detailed information
  - Game type (Cash, Tournament, Sit & Go)
  - Poker variants (NLHE, PLO, etc.)
  - Stakes, location, buy-in, cash-out
  - Duration and hands played
  - Session notes

- **Analytics & Stats**:
  - Overall profit/loss tracking
  - Win rate per hour
  - Breakdown by game type and variant
  - Session history with filtering
  - Performance metrics

- **User Features**:
  - Email/password authentication
  - User profiles with customizable settings
  - Currency selection
  - Default game preferences

## Project Structure

```
poker-bankroll/
├── src/
│   ├── constants/        # App configuration
│   ├── types/           # TypeScript type definitions
│   ├── services/        # API services (Supabase)
│   ├── contexts/        # React contexts (Auth, Navigation)
│   ├── screens/         # Screen components
│   │   ├── auth/        # Login/signup
│   │   ├── home/        # Dashboard
│   │   ├── session/     # Session logging
│   │   ├── history/     # Session history
│   │   ├── stats/       # Statistics
│   │   └── settings/    # User settings
│   ├── components/      # Reusable components
│   ├── hooks/           # Custom React hooks
│   └── utils/           # Utility functions
├── netlify/
│   └── functions/       # Serverless functions (optional)
├── App.tsx              # Root app component
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── supabase-migration.sql  # Database schema
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account
- Netlify account (for deployment)

### Installation

1. Clone the repository:
```bash
cd poker-bankroll
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase:
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL migration from `supabase-migration.sql` in the SQL editor
   - Copy your project URL and anon key

4. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Start the development server:
```bash
npm start
```

For web:
```bash
npm run web
```

## Database Schema

The app uses PostgreSQL via Supabase with the following main tables:

- **profiles**: User profiles and settings
- **poker_sessions**: Individual poker sessions
- **game_variants**: Master list of poker variants
- **user_stats**: Aggregated statistics per user
- **session_tags**: Tags for categorizing sessions

All tables include Row Level Security (RLS) policies to ensure users can only access their own data.

## Deployment

### Deploy to Netlify

1. Push your code to GitHub

2. Connect your repository to Netlify

3. Configure build settings:
   - Build command: `npx expo export -p web`
   - Publish directory: `dist`

4. Add environment variables in Netlify:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

5. Deploy!

The app will be available at your Netlify URL.

## Development

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build:web
```

## Future Enhancements

- [ ] Charts and graphs for profit trends
- [ ] Export data to CSV/Excel
- [ ] Public profile sharing
- [ ] Mobile app (iOS/Android)
- [ ] Voice input for quick session logging
- [ ] Advanced filtering and search
- [ ] Tournament tracking improvements
- [ ] Bankroll management recommendations
- [ ] Multi-currency support

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

## Acknowledgments

Based on the gym-logger project architecture, adapted for poker bankroll tracking.
