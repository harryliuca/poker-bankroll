import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Appbar, FAB } from 'react-native-paper';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionService } from '@/services/sessions';
import { statsService } from '@/services/stats';

export default function DashboardScreen() {
  const { user, profile, session, signOut } = useAuth();
  const { navigateTo } = useNavigation();
  const queryClient = useQueryClient();

  // Fetch active session
  const {
    data: activeSessions = [],
    error: activeSessionsError,
  } = useQuery({
    queryKey: ['sessions', 'active', user?.id],
    queryFn: async () => {
      const sessions = await sessionService.getSessions(user!.id);
      return sessions.filter(s => s.is_ongoing);
    },
    enabled: !!user && !!session,
    refetchInterval: 5000, // Refresh every 5 seconds for live tracking
  });

  const activeSession = activeSessions[0];

  // Fetch recent sessions
  const {
    data: recentSessions = [],
    error: recentSessionsError,
  } = useQuery({
    queryKey: ['sessions', 'recent', user?.id],
    queryFn: () => sessionService.getRecentSessions(user!.id, 5),
    enabled: !!user && !!session,
  });

  // Fetch overall stats
  const {
    data: overallStats,
    error: overallStatsError,
  } = useQuery({
    queryKey: ['stats', 'overall', user?.id],
    queryFn: () => statsService.getOverallStats(user!.id),
    enabled: !!user && !!session,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: profile?.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  useEffect(() => {
    if (activeSessionsError) {
      console.error('Dashboard: failed to load active sessions', activeSessionsError);
    }
  }, [activeSessionsError]);

  useEffect(() => {
    if (recentSessionsError) {
      console.error('Dashboard: failed to load recent sessions', recentSessionsError);
    }
  }, [recentSessionsError]);

  useEffect(() => {
    if (overallStatsError) {
      console.error('Dashboard: failed to load overall stats', overallStatsError);
    }
  }, [overallStatsError]);

  const handleRefresh = useCallback(() => {
    console.log('Dashboard: manual refresh triggered');
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  }, [queryClient]);

  const handleSignOut = useCallback(async () => {
    console.log('Dashboard: sign out pressed');
    try {
      await signOut();
    } catch (error) {
      console.error('Dashboard: sign out failed', error);
    }
  }, [signOut]);

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Poker Bankroll" />
        <Appbar.Action icon="refresh" onPress={handleRefresh} />
        <Appbar.Action icon="cog" onPress={() => navigateTo('settings')} />
        <Appbar.Action icon="logout" onPress={handleSignOut} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Active Session Alert */}
        {activeSession && (
          <Card style={[styles.card, styles.activeSessionCard]}>
            <Card.Content>
              <View style={styles.activeSessionHeader}>
                <Text variant="titleMedium" style={styles.activeSessionTitle}>
                  🎲 Live Session Active
                </Text>
                <Button
                  mode="contained"
                  onPress={() => navigateTo('live-session', { sessionId: activeSession.id })}
                  compact
                >
                  View
                </Button>
              </View>
              <Text variant="bodyMedium" style={styles.activeSessionText}>
                {activeSession.location || 'Unknown location'} • {activeSession.variant.toUpperCase()}
              </Text>
              <Text variant="bodySmall" style={styles.activeSessionTime}>
                Started: {new Date(activeSession.actual_start_time || activeSession.created_at).toLocaleTimeString()}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Stats Summary */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Overall Stats
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Total Profit
                </Text>
                <Text
                  variant="headlineSmall"
                  style={[
                    styles.statValue,
                    {
                      color:
                        (overallStats?.total_profit || 0) >= 0
                          ? '#2e7d32'
                          : '#c62828',
                    },
                  ]}
                >
                  {formatCurrency(overallStats?.total_profit || 0)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Sessions
                </Text>
                <Text variant="headlineSmall" style={styles.statValue}>
                  {overallStats?.total_sessions || 0}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Total Hours
                </Text>
                <Text variant="headlineSmall" style={styles.statValue}>
                  {overallStats?.total_hours?.toFixed(1) || '0.0'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Quick Actions
            </Text>
            <View style={styles.actionsRow}>
              <Button
                mode="contained"
                icon="play"
                onPress={() => navigateTo('start-session')}
                style={styles.actionButton}
                disabled={!!activeSession}
              >
                {activeSession ? 'Session Active' : 'Start Live Session'}
              </Button>
              <Button
                mode="outlined"
                icon="history"
                onPress={() => navigateTo('history')}
                style={styles.actionButton}
              >
                History
              </Button>
            </View>
            <Button
              mode="outlined"
              icon="chart-bar"
              onPress={() => navigateTo('stats')}
              style={styles.actionButton}
            >
              View Stats
            </Button>
          </Card.Content>
        </Card>

        {/* Recent Sessions */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Recent Sessions
            </Text>
            {recentSessions.length === 0 ? (
              <Text style={styles.emptyText}>
                No sessions yet. Start tracking your poker games!
              </Text>
            ) : (
              recentSessions.map((session) => (
                <View key={session.id} style={styles.sessionItem}>
                  <View style={styles.sessionInfo}>
                    <Text variant="bodyMedium" style={styles.sessionDate}>
                      {new Date(session.session_date + 'T00:00:00').toLocaleDateString()}
                    </Text>
                    <Text variant="bodySmall" style={styles.sessionDetails}>
                      {session.game_type.toUpperCase()} - {session.variant.toUpperCase()}
                      {session.stakes ? ` (${session.stakes})` : ''}
                    </Text>
                  </View>
                  <Text
                    variant="bodyLarge"
                    style={[
                      styles.sessionProfit,
                      { color: session.profit >= 0 ? '#2e7d32' : '#c62828' },
                    ]}
                  >
                    {formatCurrency(session.profit)}
                  </Text>
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      {!activeSession && (
        <FAB
          icon="play"
          style={styles.fab}
          onPress={() => navigateTo('start-session')}
          label="Start Session"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  statValue: {
    fontWeight: 'bold',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
    paddingVertical: 16,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontWeight: '600',
  },
  sessionDetails: {
    opacity: 0.7,
    marginTop: 2,
  },
  sessionProfit: {
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  activeSessionCard: {
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 4,
    borderLeftColor: '#2e7d32',
  },
  activeSessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeSessionTitle: {
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  activeSessionText: {
    marginBottom: 4,
  },
  activeSessionTime: {
    opacity: 0.7,
  },
});
