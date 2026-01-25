import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Event4U Mobile</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e17',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
