import React from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import DashboardScreen from './DashboardScreen';
import StartSessionScreen from '@/screens/session/StartSessionScreen';
import LiveSessionScreen from '@/screens/session/LiveSessionScreen';
import HistoryScreen from '@/screens/history/HistoryScreen';
import StatsScreen from '@/screens/stats/StatsScreen';
import SettingsScreen from '@/screens/settings/SettingsScreen';
import ImportScreen from '@/screens/import/ImportScreen';

export default function HomeScreen() {
  const { currentScreen, screenParams, navigateTo } = useNavigation();

  switch (currentScreen) {
    case 'dashboard':
      return <DashboardScreen />;
    case 'start-session':
      return <StartSessionScreen onSessionStarted={(id) => navigateTo('live-session', { sessionId: id })} />;
    case 'live-session':
      return <LiveSessionScreen sessionId={screenParams?.sessionId} />;
    case 'history':
      return <HistoryScreen />;
    case 'stats':
      return <StatsScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'import':
      return <ImportScreen />;
    default:
      return <DashboardScreen />;
  }
}
