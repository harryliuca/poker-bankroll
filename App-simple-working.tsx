import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Provider as PaperProvider, Button, Card } from 'react-native-paper';

export default function App() {
  const [count, setCount] = React.useState(0);

  return (
    <PaperProvider>
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>Poker Bankroll Tracker</Text>
            <Text style={styles.subtitle}>Test App - Count: {count}</Text>
            <Button
              mode="contained"
              onPress={() => setCount(count + 1)}
              style={styles.button}
            >
              Click Me!
            </Button>
          </Card.Content>
        </Card>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
  },
});
