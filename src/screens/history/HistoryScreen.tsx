import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { Appbar, Card, Text, Chip, FAB } from 'react-native-paper';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useQuery } from '@tanstack/react-query';
import { sessionService } from '@/services/sessions';

export default function HistoryScreen() {
  const { user, profile, session } = useAuth();
  const { navigateTo } = useNavigation();

  const {
    data: sessions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['sessions', user?.id],
    queryFn: async () => {
      const data = await sessionService.getSessions(user!.id);
      console.log('Sessions loaded:', data.length, data);
      return data;
    },
    enabled: !!user && !!session,
  });

  useEffect(() => {
    if (error) {
      console.error('History: failed to load sessions', error);
    }
  }, [error]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: profile?.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderSession = ({ item }: any) => (
    <Card style={styles.sessionCard}>
      <Card.Content>
        <View style={styles.sessionHeader}>
          <Text variant="titleMedium" style={styles.sessionDate}>
            {new Date(item.session_date + 'T00:00:00').toLocaleDateString()}
          </Text>
          <Text
            variant="headlineSmall"
            style={[
              styles.profitText,
              { color: item.profit >= 0 ? '#2e7d32' : '#c62828' },
            ]}
          >
            {formatCurrency(item.profit)}
          </Text>
        </View>

        <View style={styles.chipsRow}>
          <Chip mode="outlined" compact>
            {item.game_type.toUpperCase()}
          </Chip>
          <Chip mode="outlined" compact>
            {item.variant.toUpperCase()}
          </Chip>
          <Chip mode="outlined" compact>
            {item.location_type}
          </Chip>
        </View>

        {item.stakes && (
          <Text variant="bodySmall" style={styles.detailText}>
            Stakes: {item.stakes}
          </Text>
        )}

        {item.location && (
          <Text variant="bodySmall" style={styles.detailText}>
            Location: {item.location}
          </Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text variant="bodySmall" style={styles.statLabel}>
              Buy-in
            </Text>
            <Text variant="bodyMedium">{formatCurrency(item.buy_in)}</Text>
          </View>
          {item.total_rebuys > 0 && (
            <View style={styles.statItem}>
              <Text variant="bodySmall" style={styles.statLabel}>
                Rebuys ({item.rebuy_count})
              </Text>
              <Text variant="bodyMedium">{formatCurrency(item.total_rebuys)}</Text>
            </View>
          )}
          <View style={styles.statItem}>
            <Text variant="bodySmall" style={styles.statLabel}>
              Cash-out
            </Text>
            <Text variant="bodyMedium">{formatCurrency(item.cash_out)}</Text>
          </View>
          {item.duration_hours && (
            <View style={styles.statItem}>
              <Text variant="bodySmall" style={styles.statLabel}>
                Duration
              </Text>
              <Text variant="bodyMedium">{item.duration_hours.toFixed(1)}h</Text>
            </View>
          )}
        </View>

        {/* Total Invested Row */}
        {item.total_rebuys > 0 && (
          <View style={styles.totalInvestedRow}>
            <Text variant="bodySmall" style={styles.totalInvestedLabel}>
              Total Invested:
            </Text>
            <Text variant="bodyMedium" style={styles.totalInvestedValue}>
              {formatCurrency(item.buy_in + item.total_rebuys)}
            </Text>
          </View>
        )}

        {item.notes && (
          <Text variant="bodySmall" style={styles.notesText}>
            {item.notes}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigateTo('dashboard')} />
        <Appbar.Content title="Session History" />
      </Appbar.Header>

      {isLoading ? (
        <View style={styles.centerContent}>
          <Text>Loading...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            Unable to load history
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            Please try refreshing from the dashboard.
          </Text>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.centerContent}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            No sessions yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            Start tracking your poker games!
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      <FAB icon="plus" style={styles.fab} onPress={() => navigateTo('start-session')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
  },
  sessionCard: {
    marginBottom: 16,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionDate: {
    fontWeight: 'bold',
  },
  profitText: {
    fontWeight: 'bold',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  detailText: {
    marginBottom: 4,
    opacity: 0.7,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    opacity: 0.6,
    marginBottom: 4,
  },
  notesText: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    fontStyle: 'italic',
  },
  totalInvestedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalInvestedLabel: {
    fontWeight: '600',
    opacity: 0.8,
  },
  totalInvestedValue: {
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginBottom: 8,
    opacity: 0.6,
  },
  emptySubtext: {
    opacity: 0.4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
