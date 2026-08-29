import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { API_BASE_URL } from '../config';
import { colors } from '../theme';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('officer1@nwsdb.lk');
  const [password, setPassword] = useState('Officer@123');
  const [hidden, setHidden] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!email.trim().includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must have at least 8 characters.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onLogin(email.trim().toLowerCase(), password);
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : 'Sign-in failed.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.logo}>
              <Ionicons color={colors.primary} name="water" size={37} />
            </View>
            <Text style={styles.eyebrow}>NWSDB FIELD OPERATIONS</Text>
            <Text style={styles.title}>Welcome, field officer</Text>
            <Text style={styles.subtitle}>
              Sign in to receive assignments and update repair progress.
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons color={colors.danger} name="alert-circle" size={18} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>Email address</Text>
            <View style={styles.inputShell}>
              <Ionicons color={colors.muted} name="mail-outline" size={20} />
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="officer@nwsdb.lk"
                placeholderTextColor="#9AA7A2"
                style={styles.input}
                value={email}
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputShell}>
              <Ionicons color={colors.muted} name="lock-closed-outline" size={20} />
              <TextInput
                autoCapitalize="none"
                autoComplete="password"
                onChangeText={setPassword}
                onSubmitEditing={() => void submit()}
                placeholder="Password"
                placeholderTextColor="#9AA7A2"
                secureTextEntry={hidden}
                style={styles.input}
                value={password}
              />
              <Pressable
                accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
                onPress={() => setHidden((value) => !value)}
              >
                <Ionicons
                  color={colors.muted}
                  name={hidden ? 'eye-outline' : 'eye-off-outline'}
                  size={21}
                />
              </Pressable>
            </View>

            <ActionButton
              label="Sign in"
              loading={loading}
              onPress={() => void submit()}
              style={styles.signIn}
            />

            <View style={styles.staffOnly}>
              <Ionicons color="#84918C" name="shield-checkmark-outline" size={16} />
              <Text style={styles.staffOnlyText}>Authorized NWSDB staff only</Text>
            </View>

            <Text numberOfLines={2} style={styles.apiText}>
              Server: {API_BASE_URL}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    alignSelf: 'center',
    maxWidth: 440,
    paddingVertical: 12,
    width: '100%',
  },
  logo: {
    alignItems: 'center',
    backgroundColor: '#dae5f4',
    borderRadius: 21,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  eyebrow: {
    color: colors.primaryMid,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 27,
  },
  title: {
    color: colors.text,
    fontSize: 29,
    fontWeight: '900',
    letterSpacing: -0.6,
    marginTop: 7,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  errorBox: {
    alignItems: 'flex-start',
    backgroundColor: colors.dangerLight,
    borderRadius: 11,
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    padding: 12,
  },
  errorText: {
    color: colors.danger,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 7,
    marginTop: 18,
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    paddingVertical: 13,
  },
  signIn: {
    marginTop: 22,
  },
  staffOnly: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    marginTop: 20,
  },
  staffOnlyText: {
    color: '#84918C',
    fontSize: 12,
  },
  apiText: {
    color: '#96A19D',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 13,
    textAlign: 'center',
  },
});

