import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Appbar, List, TextInput, Button, Dialog, Portal } from 'react-native-paper';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '@/services/profiles';

export default function SettingsScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { navigateTo } = useNavigation();
  const queryClient = useQueryClient();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');

  const updateProfileMutation = useMutation({
    mutationFn: (updates: any) => profileService.updateProfile(user!.id, updates),
    onSuccess: () => {
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setDialogVisible(false);
    },
  });

  const handleUpdateName = () => {
    updateProfileMutation.mutate({ display_name: displayName });
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigateTo('dashboard')} />
        <Appbar.Content title="Settings" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <List.Section>
          <List.Subheader>Profile</List.Subheader>
          <List.Item
            title="Display Name"
            description={profile?.display_name || 'Not set'}
            left={(props) => <List.Icon {...props} icon="account" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => setDialogVisible(true)}
          />
          <List.Item
            title="Email"
            description={user?.email}
            left={(props) => <List.Icon {...props} icon="email" />}
          />
        </List.Section>

        <List.Section>
          <List.Subheader>Preferences</List.Subheader>
          <List.Item
            title="Currency"
            description={profile?.currency || 'USD'}
            left={(props) => <List.Icon {...props} icon="currency-usd" />}
          />
          <List.Item
            title="Default Game Type"
            description={profile?.default_game_type?.toUpperCase() || 'Cash'}
            left={(props) => <List.Icon {...props} icon="poker-chip" />}
          />
        </List.Section>

        <List.Section>
          <List.Subheader>Data</List.Subheader>
          <List.Item
            title="Import Sessions"
            description="Import from CSV file"
            left={(props) => <List.Icon {...props} icon="file-upload" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigateTo('import')}
          />
        </List.Section>

        <List.Section>
          <List.Subheader>Stats</List.Subheader>
          <List.Item
            title="Total Sessions"
            description={`${profile?.total_sessions || 0} sessions`}
            left={(props) => <List.Icon {...props} icon="chart-line" />}
          />
          <List.Item
            title="Total Profit"
            description={new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: profile?.currency || 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(profile?.total_profit || 0)}
            left={(props) => <List.Icon {...props} icon="cash" />}
          />
        </List.Section>
      </ScrollView>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Update Display Name</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Display Name"
              value={displayName}
              onChangeText={setDisplayName}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button
              onPress={handleUpdateName}
              loading={updateProfileMutation.isPending}
            >
              Save
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
  },
});
