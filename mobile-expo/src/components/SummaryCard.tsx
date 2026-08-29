import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: IconName;
  color: string;
}) {
  return (
    <View style={styles.card}>
      <Ionicons color={color} name={icon} size={21} />
      <Text style={styles.value}>{value}</Text>
      <Text numberOfLines={1} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: '#E6ECE9',
    borderRadius: 15,
    borderWidth: 1,
    flex: 1,
    padding: 13,
  },
  value: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 8,
  },
  label: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 1,
  },
});

