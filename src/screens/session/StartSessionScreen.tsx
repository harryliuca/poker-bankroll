import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Appbar,
  TextInput,
  Button,
  SegmentedButtons,
  Text,
  HelperText,
  Card,
} from 'react-native-paper';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { sessionService } from '@/services/sessions';
import { sessionUpdateService } from '@/services/sessionUpdates';
import { GAME_TYPES, LOCATION_TYPES } from '@/constants/config';
import type { CreateSessionDTO, GameType, LocationType } from '@/types/database';

interface Props {
  onSessionStarted: (sessionId: string) => void;
}

export default function StartSessionScreen({ onSessionStarted }: Props) {
  const { user, profile } = useAuth();
  const { navigateTo } = useNavigation();
  const queryClient = useQueryClient();

  const now = new Date();
  const [formData, setFormData] = useState<Partial<CreateSessionDTO>>({
    session_date: now.toISOString().split('T')[0], // Auto-fill: YYYY-MM-DD
    actual_start_time: now.toISOString(), // Auto-fill: full ISO timestamp
    game_type: profile?.default_game_type || 'cash',
    variant: profile?.default_variant || 'nlhe',
    location_type: 'live',
    buy_in: 0,
    cash_out: 0,
    is_ongoing: true,
  });

  const [error, setError] = useState('');

  // Fetch last session to pre-fill data
  const { data: lastSession } = useQuery({
    queryKey: ['sessions', 'last', user?.id],
    queryFn: async () => {
      const sessions = await sessionService.getSessions(user!.id);
      return sessions.length > 0 ? sessions[0] : null; // First one is most recent
    },
    enabled: !!user,
  });

  // Auto-fill from last session when it loads
  useEffect(() => {
    if (lastSession) {
      setFormData((prev) => ({
        ...prev,
        buy_in: lastSession.buy_in || 0,
        location: lastSession.location || prev.location,
        location_type: lastSession.location_type || prev.location_type,
        stakes: lastSession.stakes || prev.stakes,
        game_type: lastSession.game_type || prev.game_type,
        variant: lastSession.variant || prev.variant,
      }));
    }
  }, [lastSession]);

  // Update start time every second to keep it current
  useEffect(() => {
    const interval = setInterval(() => {
      setFormData((prev) => ({
        ...prev,
        actual_start_time: new Date().toISOString(),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const createSessionMutation = useMutation({
    mutationFn: async (data: CreateSessionDTO) => {
      // Create the session
      const session = await sessionService.createSession(user!.id, data);

      // Create initial balance update with buy-in as current stack
      await sessionUpdateService.createUpdate({
        session_id: session.id,
        update_type: 'balance_check',
        current_stack: data.buy_in,
        notes: 'Initial buy-in',
      });

      return session;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      onSessionStarted(session.id);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to start session');
    },
  });

  const handleStartSession = () => {
    setError('');

    // Validation
    if (!formData.game_type) {
      setError('Game type is required');
      return;
    }
    if (!formData.variant) {
      setError('Variant is required');
      return;
    }
    if (formData.buy_in === undefined || formData.buy_in <= 0) {
      setError('Buy-in must be greater than 0');
      return;
    }

    createSessionMutation.mutate(formData as CreateSessionDTO);
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigateTo('dashboard')} />
        <Appbar.Content title="Start Live Session" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.infoTitle}>
              🎲 Starting a Live Session
            </Text>
            <Text variant="bodyMedium" style={styles.infoText}>
              Track your session in real-time! Start when you sit down, add updates during play,
              and finish when you're done.
            </Text>
            {lastSession && (
              <Text variant="bodySmall" style={styles.infoHint}>
                💡 Fields auto-filled from your last session
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Auto-filled Date & Time (editable) */}
        <Text variant="labelLarge" style={styles.label}>
          Session Date
        </Text>
        <TextInput
          mode="outlined"
          value={formData.session_date}
          onChangeText={(text) => setFormData({ ...formData, session_date: text })}
          placeholder="YYYY-MM-DD"
          style={styles.input}
          right={<TextInput.Icon icon="calendar" />}
        />

        <Text variant="labelLarge" style={styles.label}>
          Start Time (auto-updating)
        </Text>
        <TextInput
          mode="outlined"
          value={formData.actual_start_time ? formatDateTime(formData.actual_start_time) : ''}
          editable={false}
          style={styles.input}
          right={<TextInput.Icon icon="clock" />}
        />
        <HelperText type="info">
          Time is auto-filled. Will be set when you click "Start Session"
        </HelperText>

        <Text variant="labelLarge" style={styles.label}>
          Game Type
        </Text>
        <SegmentedButtons
          value={formData.game_type || 'cash'}
          onValueChange={(value) =>
            setFormData({ ...formData, game_type: value as GameType })
          }
          buttons={GAME_TYPES.map((type) => ({
            value: type.value,
            label: type.label,
          }))}
          style={styles.input}
        />

        <Text variant="labelLarge" style={styles.label}>
          Variant
        </Text>
        <TextInput
          mode="outlined"
          value={formData.variant}
          onChangeText={(text) => setFormData({ ...formData, variant: text.toLowerCase() })}
          placeholder="e.g., nlhe, plo, omaha"
          style={styles.input}
        />

        <Text variant="labelLarge" style={styles.label}>
          Location Type
        </Text>
        <SegmentedButtons
          value={formData.location_type || 'live'}
          onValueChange={(value) =>
            setFormData({ ...formData, location_type: value as LocationType })
          }
          buttons={LOCATION_TYPES.map((type) => ({
            value: type.value,
            label: type.label,
          }))}
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label="Location/Casino Name"
          value={formData.location}
          onChangeText={(text) => setFormData({ ...formData, location: text })}
          placeholder="e.g., Bellagio, PokerStars, Home Game"
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label="Stakes (optional)"
          value={formData.stakes}
          onChangeText={(text) => setFormData({ ...formData, stakes: text })}
          placeholder="e.g., 1/2, $100"
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label="Buy-in Amount *"
          value={formData.buy_in?.toString()}
          onChangeText={(text) =>
            setFormData({ ...formData, buy_in: parseFloat(text) || 0 })
          }
          keyboardType="decimal-pad"
          style={styles.input}
          error={!!error && error.includes('Buy-in')}
        />

        {error ? (
          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>
        ) : null}

        <Button
          mode="contained"
          onPress={handleStartSession}
          loading={createSessionMutation.isPending}
          disabled={createSessionMutation.isPending}
          style={styles.submitButton}
          icon="play"
        >
          Start Session
        </Button>
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
  infoCard: {
    marginBottom: 24,
    backgroundColor: '#e8f5e9',
  },
  infoTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  infoText: {
    opacity: 0.8,
  },
  infoHint: {
    marginTop: 8,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  label: {
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    marginBottom: 12,
  },
  submitButton: {
    marginTop: 16,
    marginBottom: 32,
    paddingVertical: 6,
  },
});
