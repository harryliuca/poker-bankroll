import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Appbar, Card, Text, DataTable } from 'react-native-paper';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useQuery } from '@tanstack/react-query';
import { statsService } from '@/services/stats';
import { sessionService } from '@/services/sessions';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function StatsScreen() {
  const { user, profile } = useAuth();
  const { navigateTo } = useNavigation();

  const { data: overallStats } = useQuery({
    queryKey: ['stats', 'overall', user?.id],
    queryFn: () => statsService.getOverallStats(user!.id),
    enabled: !!user,
  });

  const { data: userStats = [] } = useQuery({
    queryKey: ['stats', 'detailed', user?.id],
    queryFn: () => statsService.getUserStats(user!.id),
    enabled: !!user,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', user?.id],
    queryFn: () => sessionService.getSessions(user!.id),
    enabled: !!user,
  });

  // Prepare chart data: cumulative profit over time
  const chartData = useMemo(() => {
    if (!sessions.length) return [];

    // Sort by start time (oldest first for cumulative calculation)
    const sortedSessions = [...sessions]
      .filter(s => !s.is_ongoing) // Only include finished sessions
      .sort((a, b) => {
        const aTime = a.actual_start_time || a.session_date;
        const bTime = b.actual_start_time || b.session_date;
        return new Date(aTime).getTime() - new Date(bTime).getTime();
      });

    let cumulativeProfit = 0;
    return sortedSessions.map((session, index) => {
      cumulativeProfit += session.profit;
      return {
        index: index + 1,
        date: new Date(session.session_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        profit: session.profit,
        cumulative: cumulativeProfit,
      };
    });
  }, [sessions]);

  // Prepare weekday data: total profit by day of week
  const weekdayData = useMemo(() => {
    if (!sessions.length) return [];

    const finishedSessions = sessions.filter(s => !s.is_ongoing);

    // Initialize data for each day of the week
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayStats: { [key: string]: { profit: number; count: number } } = {};

    weekdays.forEach(day => {
      dayStats[day] = { profit: 0, count: 0 };
    });

    // Accumulate profit by day of week
    finishedSessions.forEach(session => {
      const date = new Date(session.session_date + 'T00:00:00');
      const dayName = weekdays[date.getDay()];
      dayStats[dayName].profit += session.profit;
      dayStats[dayName].count += 1;
    });

    // Convert to chart format
    return weekdays.map(day => ({
      day: day.substring(0, 3), // Short name (Sun, Mon, etc.)
      profit: dayStats[day].profit,
      sessions: dayStats[day].count,
    }));
  }, [sessions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: profile?.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const winRate = overallStats?.total_hours
    ? (overallStats.total_profit / overallStats.total_hours).toFixed(2)
    : '0.00';

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigateTo('dashboard')} />
        <Appbar.Content title="Statistics" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Overall Stats */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Overall Performance
            </Text>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Total Sessions
                </Text>
                <Text variant="headlineMedium" style={styles.statValue}>
                  {overallStats?.total_sessions || 0}
                </Text>
              </View>

              <View style={styles.statBox}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Total Profit
                </Text>
                <Text
                  variant="headlineMedium"
                  style={[
                    styles.statValue,
                    {
                      color:
                        (overallStats?.total_profit || 0) >= 0 ? '#2e7d32' : '#c62828',
                    },
                  ]}
                >
                  {formatCurrency(overallStats?.total_profit || 0)}
                </Text>
              </View>

              <View style={styles.statBox}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Total Hours
                </Text>
                <Text variant="headlineMedium" style={styles.statValue}>
                  {overallStats?.total_hours?.toFixed(1) || '0.0'}
                </Text>
              </View>

              <View style={styles.statBox}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Win Rate (per hour)
                </Text>
                <Text variant="headlineMedium" style={styles.statValue}>
                  {formatCurrency(parseFloat(winRate))}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Profit/Loss Chart */}
        {chartData.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                Cumulative Profit/Loss
              </Text>
              <View style={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                    />
                    <Legend />
                    <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#6200ee"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                      name="Total Profit"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Weekday Performance Chart */}
        {weekdayData.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                Performance by Day of Week
              </Text>
              <View style={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weekdayData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'profit') return formatCurrency(value);
                        return value;
                      }}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                    />
                    <Legend />
                    <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                    <Bar
                      dataKey="profit"
                      fill="#6200ee"
                      name="Total Profit"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Breakdown by Game Type */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Breakdown by Game
            </Text>

            {userStats.length === 0 ? (
              <Text style={styles.emptyText}>No stats available yet</Text>
            ) : (
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title>Game</DataTable.Title>
                  <DataTable.Title numeric>Sessions</DataTable.Title>
                  <DataTable.Title numeric>Profit</DataTable.Title>
                  <DataTable.Title numeric>Win Rate</DataTable.Title>
                </DataTable.Header>

                {userStats.map((stat) => (
                  <DataTable.Row key={stat.id}>
                    <DataTable.Cell>
                      <View>
                        <Text variant="bodyMedium">
                          {stat.game_type?.toUpperCase() || 'N/A'}
                        </Text>
                        <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                          {stat.variant?.toUpperCase() || ''}
                        </Text>
                      </View>
                    </DataTable.Cell>
                    <DataTable.Cell numeric>
                      {stat.total_sessions}
                    </DataTable.Cell>
                    <DataTable.Cell
                      numeric
                      textStyle={{
                        color: stat.total_profit >= 0 ? '#2e7d32' : '#c62828',
                      }}
                    >
                      {formatCurrency(stat.total_profit)}
                    </DataTable.Cell>
                    <DataTable.Cell numeric>
                      {stat.win_rate
                        ? `${formatCurrency(stat.win_rate)}/h`
                        : '-'}
                    </DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>
            )}
          </Card.Content>
        </Card>

        {/* Additional Stats */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Additional Stats
            </Text>

            <View style={styles.additionalStatsRow}>
              <View style={styles.additionalStatItem}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Current Bankroll
                </Text>
                <Text variant="titleLarge" style={styles.statValue}>
                  {formatCurrency(overallStats?.current_bankroll || 0)}
                </Text>
              </View>

              <View style={styles.additionalStatItem}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Last Session
                </Text>
                <Text variant="titleMedium" style={styles.statValue}>
                  {overallStats?.last_session_date
                    ? new Date(overallStats.last_session_date + 'T00:00:00').toLocaleDateString()
                    : 'N/A'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
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
  chartContainer: {
    marginVertical: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statLabel: {
    opacity: 0.7,
    marginBottom: 8,
    textAlign: 'center',
  },
  statValue: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
    paddingVertical: 16,
  },
  additionalStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  additionalStatItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
});
