import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: '#E6ECE9',
    borderRadius: 17,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    color: colors.primaryMid,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  content: {
    marginTop: 13,
  },
});

