import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Appbar,
  TextInput,
  Button,
  SegmentedButtons,
  Text,
  HelperText,
} from 'react-native-paper';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionService } from '@/services/sessions';
import { GAME_TYPES, LOCATION_TYPES, COMMON_STAKES } from '@/constants/config';
import type { CreateSessionDTO, GameType, LocationType } from '@/types/database';

export default function NewSessionScreen() {
  const { user, profile } = useAuth();
  const { navigateTo } = useNavigation();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<CreateSessionDTO>>({
    session_date: new Date().toISOString().split('T')[0],
    game_type: profile?.default_game_type || 'cash',
    variant: profile?.default_variant || 'nlhe',
    location_type: 'live',
    buy_in: 0,
    cash_out: 0,
  });

  const [error, setError] = useState('');

  const createSessionMutation = useMutation({
    mutationFn: (data: CreateSessionDTO) => sessionService.createSession(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      navigateTo('dashboard');
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create session');
    },
  });

  const handleSubmit = () => {
    setError('');

    // Validation
    if (!formData.session_date) {
      setError('Session date is required');
      return;
    }
    if (!formData.game_type) {
      setError('Game type is required');
      return;
    }
    if (!formData.variant) {
      setError('Variant is required');
      return;
    }
    if (formData.buy_in === undefined || formData.buy_in < 0) {
      setError('Valid buy-in is required');
      return;
    }
    if (formData.cash_out === undefined || formData.cash_out < 0) {
      setError('Valid cash-out is required');
      return;
    }

    createSessionMutation.mutate(formData as CreateSessionDTO);
  };

  const profit = (formData.cash_out || 0) - (formData.buy_in || 0);

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigateTo('dashboard')} />
        <Appbar.Content title="New Session" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Text variant="labelLarge" style={styles.label}>
          Session Date
        </Text>
        <TextInput
          mode="outlined"
          value={formData.session_date}
          onChangeText={(text) => setFormData({ ...formData, session_date: text })}
          placeholder="YYYY-MM-DD"
          style={styles.input}
        />

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
          label="Location (optional)"
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
          label="Buy-in"
          value={formData.buy_in?.toString()}
          onChangeText={(text) =>
            setFormData({ ...formData, buy_in: parseFloat(text) || 0 })
          }
          keyboardType="decimal-pad"
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label="Cash Out"
          value={formData.cash_out?.toString()}
          onChangeText={(text) =>
            setFormData({ ...formData, cash_out: parseFloat(text) || 0 })
          }
          keyboardType="decimal-pad"
          style={styles.input}
        />

        <View style={styles.profitContainer}>
          <Text variant="titleMedium">Profit/Loss:</Text>
          <Text
            variant="headlineMedium"
            style={[styles.profitValue, { color: profit >= 0 ? '#2e7d32' : '#c62828' }]}
          >
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: profile?.currency || 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(profit)}
          </Text>
        </View>

        <TextInput
          mode="outlined"
          label="Duration (hours, optional)"
          value={formData.duration_hours?.toString()}
          onChangeText={(text) =>
            setFormData({ ...formData, duration_hours: parseFloat(text) || undefined })
          }
          keyboardType="decimal-pad"
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label="Hands Played (optional)"
          value={formData.hands_played?.toString()}
          onChangeText={(text) =>
            setFormData({ ...formData, hands_played: parseInt(text) || undefined })
          }
          keyboardType="number-pad"
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label="Notes (optional)"
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          multiline
          numberOfLines={4}
          style={styles.input}
        />

        {error ? (
          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>
        ) : null}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={createSessionMutation.isPending}
          disabled={createSessionMutation.isPending}
          style={styles.submitButton}
        >
          Save Session
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
  label: {
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    marginBottom: 12,
  },
  profitContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
  },
  profitValue: {
    fontWeight: 'bold',
  },
  submitButton: {
    marginTop: 16,
    marginBottom: 32,
    paddingVertical: 6,
  },
});
