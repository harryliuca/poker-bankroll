import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Appbar,
  Card,
  Text,
  Button,
  TextInput,
  Chip,
  FAB,
  Dialog,
  Portal,
  SegmentedButtons,
} from 'react-native-paper';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionService } from '@/services/sessions';
import { sessionUpdateService } from '@/services/sessionUpdates';
import type { PokerSession, SessionUpdate, SessionUpdateType } from '@/types/database';

interface Props {
  sessionId: string;
}

export default function LiveSessionScreen({ sessionId }: Props) {
  const { user, profile } = useAuth();
  const { navigateTo } = useNavigation();
  const queryClient = useQueryClient();

  // Fetch session and updates
  const { data: session } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionService.getSession(sessionId),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: updates = [] } = useQuery<SessionUpdate[]>({
    queryKey: ['sessionUpdates', sessionId],
    queryFn: () => sessionUpdateService.getSessionUpdates(sessionId),
    refetchInterval: 5000,
  });

  // Dialog states
  const [dialogVisible, setDialogVisible] = useState(false);
  const [updateType, setUpdateType] = useState<SessionUpdateType>('balance_check');
  const [amount, setAmount] = useState('');
  const [currentStack, setCurrentStack] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [finishDialogVisible, setFinishDialogVisible] = useState(false);
  const [finalBalance, setFinalBalance] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');

  // Timer for session duration
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (session?.actual_start_time) {
      const interval = setInterval(() => {
        const start = new Date(session.actual_start_time!).getTime();
        const now = new Date().getTime();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [session?.actual_start_time]);

  // Mutations
  const addUpdateMutation = useMutation({
    mutationFn: (data: any) => sessionUpdateService.createUpdate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessionUpdates', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      setDialogVisible(false);
      setAmount('');
      setCurrentStack('');
      setExpenseAmount('');
      setNotes('');
    },
  });

  const finishSessionMutation = useMutation({
    mutationFn: (data: any) => sessionService.updateSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      navigateTo('dashboard');
    },
  });

  const handleAddUpdate = async () => {
    // For balance_check: only create if rebuy amount OR if current stack was changed
    // For rebuy: always create the rebuy update
    if (updateType === 'rebuy' || updateType === 'note' ||
        (updateType === 'balance_check' && (amount || notes))) {
      await addUpdateMutation.mutateAsync({
        session_id: sessionId,
        update_type: updateType,
        amount: amount ? parseFloat(amount) : undefined,
        current_stack: currentStack ? parseFloat(currentStack) : undefined,
        notes: notes || undefined,
      });
    } else if (updateType === 'balance_check' && currentStack) {
      // Only update stack if it has a value
      await addUpdateMutation.mutateAsync({
        session_id: sessionId,
        update_type: updateType,
        current_stack: parseFloat(currentStack),
        notes: notes || undefined,
      });
    }

    // If there's an expense, create a separate chip_spend update
    if (expenseAmount && parseFloat(expenseAmount) > 0) {
      await sessionUpdateService.createUpdate({
        session_id: sessionId,
        update_type: 'chip_spend',
        amount: parseFloat(expenseAmount),
        notes: `Expense in chip`,
      });
    }

    // Refresh queries
    queryClient.invalidateQueries({ queryKey: ['sessionUpdates', sessionId] });
    queryClient.invalidateQueries({ queryKey: ['session', sessionId] });

    // Clear form
    setDialogVisible(false);
    setAmount('');
    setCurrentStack('');
    setExpenseAmount('');
    setNotes('');
  };

  const handleFinishSession = () => {
    // Combine date and time into ISO string
    const endDateTime = new Date(`${endDate}T${endTime}`);
    const endTimeISO = endDateTime.toISOString();

    const startTime = new Date(session!.actual_start_time!).getTime();
    const endTimeMs = endDateTime.getTime();
    const durationHours = (endTimeMs - startTime) / (1000 * 60 * 60);

    finishSessionMutation.mutate({
      id: sessionId,
      session_date: endDate, // Update session_date to match the end date
      actual_end_time: endTimeISO,
      cash_out: parseFloat(finalBalance),
      duration_hours: durationHours,
      is_ongoing: false,
    });
  };

  // Auto-fill end date and time when opening finish dialog
  const handleOpenFinishDialog = () => {
    const now = new Date();
    setEndDate(now.toISOString().split('T')[0]); // YYYY-MM-DD
    setEndTime(now.toTimeString().slice(0, 5)); // HH:MM
    setFinishDialogVisible(true);
  };

  // Auto-fill current stack when opening add update dialog
  const handleOpenUpdateDialog = () => {
    // Find the latest update with a current_stack value
    const latestStackUpdate = updates.slice().reverse().find(update => update.current_stack !== null);
    const latestStackValue = latestStackUpdate?.current_stack ?? session?.buy_in ?? 0;
    setCurrentStack(latestStackValue.toString());
    setDialogVisible(true);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: profile?.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalInvested = session ? session.buy_in + (session.total_rebuys || 0) : 0;

  // Find the latest update with a current_stack value
  const latestStackUpdate = updates.slice().reverse().find(update => update.current_stack !== null);
  const latestStack = latestStackUpdate?.current_stack ?? session?.buy_in ?? 0;

  const currentPL = latestStack - totalInvested;

  if (!session) return null;

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigateTo('dashboard')} />
        <Appbar.Content title="Live Session" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Session Timer */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineLarge" style={styles.timer}>
              {formatTime(elapsedTime)}
            </Text>
            <Text variant="bodyMedium" style={styles.timerLabel}>
              Session Duration
            </Text>
          </Card.Content>
        </Card>

        {/* Current Status */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Current Status
            </Text>

            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Text variant="bodySmall" style={styles.statusLabel}>
                  Total Invested
                </Text>
                <Text variant="titleLarge">{formatCurrency(totalInvested)}</Text>
                <Text variant="bodySmall" style={styles.statusSublabel}>
                  Initial: {formatCurrency(session.buy_in)}
                  {session.rebuy_count > 0 && ` + ${session.rebuy_count} rebuys`}
                </Text>
              </View>

              <View style={styles.statusItem}>
                <Text variant="bodySmall" style={styles.statusLabel}>
                  Current Stack
                </Text>
                <Text variant="titleLarge">{formatCurrency(latestStack)}</Text>
              </View>
            </View>

            <View style={styles.plContainer}>
              <Text variant="bodySmall" style={styles.statusLabel}>
                Current P/L
              </Text>
              <Text
                variant="headlineMedium"
                style={[styles.plValue, { color: currentPL >= 0 ? '#2e7d32' : '#c62828' }]}
              >
                {formatCurrency(currentPL)}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Session Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Session Info
            </Text>
            <View style={styles.infoRow}>
              <Chip mode="outlined">{session.game_type.toUpperCase()}</Chip>
              <Chip mode="outlined">{session.variant.toUpperCase()}</Chip>
              <Chip mode="outlined">{session.location_type}</Chip>
            </View>
            {session.location && (
              <Text variant="bodyMedium" style={styles.infoText}>
                📍 {session.location}
              </Text>
            )}
            {session.stakes && (
              <Text variant="bodyMedium" style={styles.infoText}>
                💰 Stakes: {session.stakes}
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Session Timeline */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Session Timeline
            </Text>

            {updates.map((update, index) => (
              <View key={update.id} style={styles.updateItem}>
                <View style={styles.updateHeader}>
                  <Chip mode="flat" compact>
                    {update.update_type.replace('_', ' ').toUpperCase()}
                  </Chip>
                  <Text variant="bodySmall" style={styles.updateTime}>
                    {new Date(update.created_at).toLocaleTimeString()}
                  </Text>
                </View>

                {update.amount && (
                  <Text variant="bodyMedium">
                    Amount: {formatCurrency(update.amount)}
                  </Text>
                )}
                {update.current_stack !== null && (
                  <Text variant="bodyMedium">
                    Stack: {formatCurrency(update.current_stack)}
                  </Text>
                )}
                {update.notes && (
                  <Text variant="bodySmall" style={styles.updateNotes}>
                    {update.notes}
                  </Text>
                )}
              </View>
            ))}

            {updates.length === 0 && (
              <Text style={styles.emptyText}>No updates yet</Text>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          onPress={handleOpenUpdateDialog}
          style={styles.actionButton}
          icon="plus"
        >
          Add Update
        </Button>
        <Button
          mode="contained"
          onPress={handleOpenFinishDialog}
          style={styles.actionButton}
          icon="check"
        >
          Finish Session
        </Button>
      </View>

      {/* Add Update Dialog */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Add Update</Dialog.Title>
          <Dialog.Content>
            <Text variant="labelLarge" style={styles.dialogLabel}>
              Update Type
            </Text>
            <SegmentedButtons
              value={updateType}
              onValueChange={(value) => setUpdateType(value as SessionUpdateType)}
              buttons={[
                { value: 'rebuy', label: 'Rebuy' },
                { value: 'balance_check', label: 'Balance' },
                { value: 'note', label: 'Note' },
              ]}
              style={styles.dialogInput}
            />

            {updateType === 'rebuy' && (
              <>
                <Text variant="bodyMedium" style={styles.dialogHelpText}>
                  💰 Adding a rebuy? Enter both amounts:
                </Text>
                <TextInput
                  label="Rebuy Amount *"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  mode="outlined"
                  style={styles.dialogInput}
                  placeholder="How much are you adding?"
                />
                <TextInput
                  label="New Total Stack *"
                  value={currentStack}
                  onChangeText={setCurrentStack}
                  keyboardType="decimal-pad"
                  mode="outlined"
                  style={styles.dialogInput}
                  placeholder="Your total chips after rebuy"
                />
              </>
            )}

            {updateType === 'balance_check' && (
              <>
                <Text variant="bodyMedium" style={styles.dialogHelpText}>
                  📊 Update your current chip count:
                </Text>
                <TextInput
                  label="Current Stack *"
                  value={currentStack}
                  onChangeText={setCurrentStack}
                  keyboardType="decimal-pad"
                  mode="outlined"
                  style={styles.dialogInput}
                  placeholder="Your current chips"
                />
                <TextInput
                  label="Expense in Chip (optional)"
                  value={expenseAmount}
                  onChangeText={setExpenseAmount}
                  keyboardType="decimal-pad"
                  mode="outlined"
                  style={styles.dialogInput}
                  placeholder="Tips, food, etc."
                />
              </>
            )}

            {updateType === 'note' && (
              <Text variant="bodyMedium" style={styles.dialogHelpText}>
                📝 Add a note about this session:
              </Text>
            )}

            <TextInput
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              mode="outlined"
              style={styles.dialogInput}
              placeholder="Add any notes..."
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleAddUpdate} loading={addUpdateMutation.isPending}>
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Finish Session Dialog */}
        <Dialog
          visible={finishDialogVisible}
          onDismiss={() => setFinishDialogVisible(false)}
        >
          <Dialog.Title>Finish Session</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              💵 Enter your final chip count:
            </Text>
            <TextInput
              label="Final Balance *"
              value={finalBalance}
              onChangeText={setFinalBalance}
              keyboardType="decimal-pad"
              mode="outlined"
              style={styles.dialogInput}
              placeholder="Your final chip amount"
            />

            <Text variant="labelLarge" style={styles.dialogLabel}>
              End Date & Time
            </Text>
            <Text variant="bodySmall" style={styles.dialogHelpText}>
              Auto-filled with current time. Adjust if needed.
            </Text>

            <TextInput
              label="End Date"
              value={endDate}
              onChangeText={setEndDate}
              mode="outlined"
              style={styles.dialogInput}
              placeholder="YYYY-MM-DD"
              right={<TextInput.Icon icon="calendar" />}
            />

            <TextInput
              label="End Time"
              value={endTime}
              onChangeText={setEndTime}
              mode="outlined"
              style={styles.dialogInput}
              placeholder="HH:MM (24-hour format)"
              right={<TextInput.Icon icon="clock" />}
            />

            <Text variant="bodySmall" style={styles.dialogHint}>
              Session duration: {formatTime(elapsedTime)} ({(elapsedTime / 3600).toFixed(2)} hours)
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setFinishDialogVisible(false)}>Cancel</Button>
            <Button
              onPress={handleFinishSession}
              loading={finishSessionMutation.isPending}
              disabled={!finalBalance || !endDate || !endTime}
            >
              Finish
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    marginBottom: 12,
    fontWeight: 'bold',
  },
  timer: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  timerLabel: {
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  statusSublabel: {
    opacity: 0.6,
    fontSize: 12,
    marginTop: 4,
  },
  plContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  plValue: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  infoText: {
    marginBottom: 4,
  },
  updateItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  updateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  updateTime: {
    opacity: 0.6,
  },
  updateNotes: {
    marginTop: 4,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
    paddingVertical: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  actionButton: {
    flex: 1,
  },
  dialogLabel: {
    marginTop: 8,
    marginBottom: 4,
  },
  dialogInput: {
    marginBottom: 12,
  },
  dialogText: {
    marginBottom: 12,
  },
  dialogHint: {
    marginTop: 8,
    opacity: 0.7,
  },
  dialogHelpText: {
    marginTop: 8,
    marginBottom: 12,
    opacity: 0.8,
  },
});
