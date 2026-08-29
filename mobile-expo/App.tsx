import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ComplaintDetailScreen } from './src/screens/ComplaintDetailScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { api } from './src/services/api';
import { initializeDatabase } from './src/services/database';
import { colors } from './src/theme';
import type { AppUser } from './src/types';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        await initializeDatabase();
        if (await api.hasSession()) {
          const restoredUser = await api.me();
          if (restoredUser.role === 'OFFICER') setUser(restoredUser);
        }
      } catch {
        await api.logout().catch(() => undefined);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedComplaintId) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedComplaintId(null);
      return true;
    });
    return () => subscription.remove();
  }, [selectedComplaintId]);

  async function login(email: string, password: string) {
    setUser(await api.login(email, password));
  }

  async function logout() {
    await api.logout();
    setSelectedComplaintId(null);
    setUser(null);
  }

  let content;
  if (booting) {
    content = (
      <SafeAreaView style={styles.splash}>
        <View style={styles.splashLogo}>
          <Text style={styles.drop}>●</Text>
        </View>
        <Text style={styles.splashTitle}>NWSDB Field Operations</Text>
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  } else if (!user) {
    content = <LoginScreen onLogin={login} />;
  } else if (selectedComplaintId) {
    content = (
      <ComplaintDetailScreen
        complaintId={selectedComplaintId}
        onBack={() => setSelectedComplaintId(null)}
      />
    );
  } else {
    content = (
      <HomeScreen
        onLogout={() => void logout()}
        onOpenComplaint={setSelectedComplaintId}
        user={user}
      />
    );
  }

  return (
    <View style={styles.app}>
      <StatusBar style="dark" />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.background,
  },
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 22,
    height: 70,
    justifyContent: 'center',
    width: 70,
  },
  drop: {
    color: colors.primary,
    fontSize: 44,
    lineHeight: 49,
  },
  splashTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 17,
  },
  loader: {
    marginTop: 22,
  },
});
