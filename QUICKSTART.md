# Quick Start Guide

## Local Development Setup

### Step 1: Install Dependencies

```bash
cd /Users/harryliu/CascadeProjects/poker-bankroll
npm install
```

### Step 2: Set Up Supabase

1. Go to [https://supabase.com](https://supabase.com) and create a free account
2. Create a new project:
   - Choose a project name (e.g., "poker-bankroll")
   - Set a strong database password
   - Choose a region close to you
   - Wait for the project to be provisioned (~2 minutes)

3. Run the database migration:
   - In your Supabase dashboard, go to the **SQL Editor** (left sidebar)
   - Click **New Query**
   - Copy the entire contents of `supabase-migration.sql`
   - Paste it into the SQL editor
   - Click **Run** to execute the migration

4. Get your API credentials:
   - Go to **Project Settings** (gear icon in sidebar)
   - Click **API** section
   - Copy the following:
     - **Project URL** (looks like `https://xxxxx.supabase.co`)
     - **anon/public key** (long string starting with `eyJ...`)

### Step 3: Configure Environment Variables

```bash
# Create .env file from the example
cp .env.example .env
```

Open `.env` in your text editor and add your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Start the Development Server

```bash
npm start
```

This will start the Expo development server. You'll see a QR code and menu options.

### Step 5: Open in Web Browser

Press `w` to open in web browser, or navigate to:
```
http://localhost:8081
```

Alternatively, you can run:
```bash
npm run web
```

### Step 6: Create an Account

1. The app will show the login screen
2. Click **"Don't have an account? Sign Up"**
3. Enter your email and password
4. Click **Sign Up**
5. You'll be automatically logged in to the dashboard

### Step 7: Start Tracking Sessions

1. Click **"New Session"** button
2. Fill in session details:
   - Date
   - Game type (Cash/Tournament/SNG)
   - Variant (e.g., nlhe, plo)
   - Location
   - Buy-in and Cash-out amounts
3. Click **"Save Session"**
4. View your stats on the dashboard!

## Troubleshooting

### Port Already in Use
If port 8081 is already in use:
```bash
# Kill the process on port 8081
lsof -ti:8081 | xargs kill -9

# Or use a different port
npm start -- --port 8082
```

### Expo CLI Not Found
```bash
npm install -g expo-cli
```

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Supabase Connection Issues
- Check that your `.env` file has the correct credentials
- Verify the Supabase project is running (check dashboard)
- Make sure the SQL migration ran successfully (check for tables in Supabase dashboard)

### TypeScript Errors
The project uses path aliases (`@/*`). If you see import errors, try:
```bash
# Restart the dev server
npm start -- --clear
```

## Testing the App

### Create Test Sessions

Try creating sessions with different scenarios:

1. **Winning cash game session**:
   - Game Type: Cash
   - Variant: nlhe
   - Stakes: 1/2
   - Buy-in: 200
   - Cash-out: 450
   - Profit: +250

2. **Losing tournament**:
   - Game Type: Tournament
   - Variant: nlhe
   - Stakes: $100
   - Buy-in: 100
   - Cash-out: 0
   - Profit: -100

3. **Online PLO session**:
   - Game Type: Cash
   - Variant: plo
   - Location Type: Online
   - Location: PokerStars
   - Stakes: 0.50/1
   - Buy-in: 100
   - Cash-out: 175
   - Profit: +75

### Check the Stats

After adding a few sessions:
- Go to **Stats** screen to see performance breakdown
- Check **History** to see all sessions
- View the **Dashboard** for quick overview

## Development Tips

### Hot Reload
The app supports hot reload. Just save your files and the browser will automatically refresh.

### React Query Devtools
You can add React Query devtools to inspect queries and cache:
```bash
npm install @tanstack/react-query-devtools
```

### Database Inspection
- Go to Supabase dashboard
- Click **Table Editor** to view/edit data directly
- Check **Database** > **Functions** to see triggers
- View **Authentication** > **Users** to see registered users

## Next Steps

- Customize the theme in `App.tsx`
- Add more poker variants in the database
- Create custom filters for sessions
- Export data to CSV/Excel
- Add charts with Victory Native

Enjoy tracking your poker bankroll!
