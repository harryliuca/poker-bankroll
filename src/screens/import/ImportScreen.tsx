import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Appbar,
  Card,
  Text,
  Button,
  ProgressBar,
  List,
  Divider,
} from 'react-native-paper';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionService } from '@/services/sessions';
import { importSessionsFromCSV } from '@/utils/csvImporter';
import type { CreateSessionDTO } from '@/types/database';

export default function ImportScreen() {
  const { user } = useAuth();
  const { navigateTo } = useNavigation();
  const queryClient = useQueryClient();

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    success: number;
    errors: string[];
  } | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setProgress(0);
    setResults(null);

    try {
      // Read file
      const text = await file.text();

      // Parse CSV
      const { success, errors } = await importSessionsFromCSV(text, user!.id);

      if (success.length === 0) {
        setResults({ success: 0, errors: errors.length > 0 ? errors : ['No valid sessions found'] });
        setImporting(false);
        return;
      }

      // Import sessions one by one
      let imported = 0;
      const importErrors: string[] = [...errors];

      for (let i = 0; i < success.length; i++) {
        try {
          await sessionService.createSession(user!.id, success[i]);
          imported++;
          setProgress((i + 1) / success.length);
        } catch (error: any) {
          importErrors.push(`Session ${i + 1}: ${error.message}`);
        }
      }

      setResults({ success: imported, errors: importErrors });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    } catch (error: any) {
      setResults({ success: 0, errors: [error.message] });
    } finally {
      setImporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigateTo('dashboard')} />
        <Appbar.Content title="Import Sessions" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              📊 Import Your Poker History
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              Upload a CSV file from your previous poker tracking tool to import your session history.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              CSV Format Requirements
            </Text>
            <Text variant="bodyMedium" style={styles.formatText}>
              Your CSV file should include these columns:
            </Text>

            <List.Item
              title="Date"
              description="Session date (MM/DD/YYYY)"
              left={props => <List.Icon {...props} icon="calendar" />}
              titleStyle={styles.listTitle}
            />
            <List.Item
              title="Location"
              description="Casino or online site name"
              left={props => <List.Icon {...props} icon="map-marker" />}
              titleStyle={styles.listTitle}
            />
            <List.Item
              title="Game"
              description="Game type (Hold'em, Omaha, etc.)"
              left={props => <List.Icon {...props} icon="cards" />}
              titleStyle={styles.listTitle}
            />
            <List.Item
              title="Limit"
              description="No Limit, Pot Limit, Fixed Limit"
              left={props => <List.Icon {...props} icon="chart-line" />}
              titleStyle={styles.listTitle}
            />
            <List.Item
              title="Stakes"
              description="Blinds or buy-in (e.g., 1/2, $100)"
              left={props => <List.Icon {...props} icon="currency-usd" />}
              titleStyle={styles.listTitle}
            />
            <List.Item
              title="Buy-in"
              description="Initial buy-in amount"
              left={props => <List.Icon {...props} icon="cash-plus" />}
              titleStyle={styles.listTitle}
            />
            <List.Item
              title="Cash Out"
              description="Final cash-out amount"
              left={props => <List.Icon {...props} icon="cash-minus" />}
              titleStyle={styles.listTitle}
            />
            <List.Item
              title="Result"
              description="Profit/Loss (optional)"
              left={props => <List.Icon {...props} icon="chart-bar" />}
              titleStyle={styles.listTitle}
            />
          </Card.Content>
        </Card>

        {!importing && !results && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Upload CSV File
              </Text>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                style={styles.fileInput}
              />
              <Text variant="bodySmall" style={styles.hint}>
                Select a CSV file to begin import
              </Text>
            </Card.Content>
          </Card>
        )}

        {importing && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Importing Sessions...
              </Text>
              <ProgressBar progress={progress} style={styles.progressBar} />
              <Text variant="bodySmall" style={styles.progressText}>
                {Math.round(progress * 100)}% complete
              </Text>
            </Card.Content>
          </Card>
        )}

        {results && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Import Complete
              </Text>

              <View style={styles.resultBox}>
                <Text variant="headlineMedium" style={styles.successCount}>
                  {results.success}
                </Text>
                <Text variant="bodyLarge">sessions imported successfully</Text>
              </View>

              {results.errors.length > 0 && (
                <>
                  <Divider style={styles.divider} />
                  <Text variant="titleSmall" style={styles.errorsTitle}>
                    ⚠️ Errors ({results.errors.length})
                  </Text>
                  {results.errors.slice(0, 10).map((error, index) => (
                    <Text key={index} variant="bodySmall" style={styles.errorText}>
                      • {error}
                    </Text>
                  ))}
                  {results.errors.length > 10 && (
                    <Text variant="bodySmall" style={styles.errorText}>
                      ... and {results.errors.length - 10} more errors
                    </Text>
                  )}
                </>
              )}

              <Button
                mode="contained"
                onPress={() => navigateTo('dashboard')}
                style={styles.doneButton}
                icon="check"
              >
                Done
              </Button>

              <Button
                mode="outlined"
                onPress={() => {
                  setResults(null);
                  setProgress(0);
                }}
                style={styles.importMoreButton}
              >
                Import Another File
              </Button>
            </Card.Content>
          </Card>
        )}
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
  title: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  description: {
    opacity: 0.8,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  formatText: {
    marginBottom: 8,
    opacity: 0.8,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  fileInput: {
    marginTop: 12,
    marginBottom: 12,
    padding: 12,
    border: '2px dashed #ccc',
    borderRadius: 8,
    cursor: 'pointer',
  },
  hint: {
    opacity: 0.6,
    fontStyle: 'italic',
  },
  progressBar: {
    marginVertical: 16,
  },
  progressText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  resultBox: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    marginBottom: 16,
  },
  successCount: {
    color: '#2e7d32',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  errorsTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  errorText: {
    color: '#c62828',
    marginBottom: 4,
  },
  doneButton: {
    marginTop: 16,
  },
  importMoreButton: {
    marginTop: 8,
  },
});
