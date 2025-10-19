# Live Session Tracking Feature

## Overview
The app now supports real-time session tracking! Users can start a session when they sit down at the table, add updates during play, and finish when they're done.

## Setup Required

### 1. Run Database Migration
You need to run the additional schema updates in Supabase:

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/aqtiijoulbizlnmsdkak
2. Click **SQL Editor**
3. Open `/Users/harryliu/CascadeProjects/poker-bankroll/supabase-updates.sql`
4. Copy ALL the contents and paste into the SQL editor
5. Click **Run**

This will create:
- `session_updates` table for tracking rebuys, balance checks, etc.
- Additional columns in `poker_sessions` for live tracking
- Triggers to auto-calculate totals

### 2. Restart the App
The app should already be running. Just refresh your browser at `http://localhost:8082`

## How to Use

### Starting a Session

1. **Click "Start Live Session"** on the dashboard
2. The form will auto-fill:
   - **Date**: Today's date (editable)
   - **Start Time**: Current time (auto-updating every second)
3. Fill in:
   - Game type (Cash/Tournament/SNG)
   - Variant (e.g., nlhe, plo)
   - Location (casino/online)
   - Stakes
   - **Buy-in amount** (required)
4. Click **"Start Session"**

### During the Session

You'll see a live session screen with:

- **Timer**: Shows elapsed time (HH:MM:SS)
- **Current Status**:
  - Total invested (buy-in + rebuys)
  - Current stack
  - Current P/L (profit/loss)
- **Session Timeline**: All updates in chronological order

**Add Updates:**
- Click **"Add Update"** button
- Choose type:
  - **Rebuy**: Add money (auto-updates total invested)
  - **Balance Check**: Record current stack
  - **Note**: Add text notes
- Enter amount and/or current stack
- Click **"Add"**

### Finishing the Session

1. Click **"Finish Session"**
2. Enter your **final chip count/balance**
3. The app auto-calculates:
   - Total time played
   - Final profit/loss
4. Session is saved to history

## Features

### Auto-Fill Date & Time
- Date and time are automatically filled with current values
- You can edit them if needed (e.g., if you forgot to start the session on time)
- Start time updates every second until you click "Start Session"

### Real-Time Tracking
- Session timer runs continuously
- Dashboard shows active session banner
- Can't start multiple sessions (button is disabled)
- Updates refresh every 5 seconds

### Session Updates
Track everything during your session:
- **Rebuys/Add-ons**: Automatically added to total invested
- **Balance Checks**: Track your stack at any point
- **Chip Spends**: Record tournament rebuys, tips, etc.
- **Notes**: Add observations, hand notes, etc.
- **Breaks**: Mark when you take breaks

### Calculations
The app automatically calculates:
- **Total Invested** = Buy-in + All Rebuys
- **Current P/L** = Current Stack - Total Invested
- **Final Profit** = Cash Out - Total Invested
- **Duration** = End Time - Start Time (in hours)
- **Win Rate** = Profit / Hours

## Dashboard Integration

When you have an active session:
- **Green banner** at the top shows live session
- **"View" button** to jump back to the session
- **"Start Live Session" button is disabled**
- **FAB (floating button) is hidden**

When no active session:
- Normal dashboard
- "Start Live Session" button is active
- FAB shows "Start Session"

## Data Structure

### Poker Sessions
Now includes:
- `actual_start_time`: Exact timestamp when session started
- `actual_end_time`: Exact timestamp when session finished
- `total_rebuys`: Sum of all rebuy amounts
- `rebuy_count`: Number of rebuys
- `is_ongoing`: Boolean flag for active sessions

### Session Updates
New table tracks all activities:
- `update_type`: rebuy, addon, chip_spend, balance_check, note, break
- `amount`: Dollar amount (for rebuys, etc.)
- `current_stack`: Chip count at this moment
- `notes`: Text notes
- `created_at`: Timestamp

## Future Enhancements

Potential additions:
- Hand history import
- Tournament position tracking
- Session photos/attachments
- Break timer
- Location GPS tracking
- Session sharing
- Live session notifications
- Multi-table session support
