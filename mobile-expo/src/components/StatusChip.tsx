import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import type { ComplaintStatus } from '../types';
import { statusLabel } from '../types';

const palette: Record<ComplaintStatus, { background: string; foreground: string }> = {
  New: { background: '#EEF0F1', foreground: '#4F5C58' },
  Assigned: { background: colors.warningLight, foreground: colors.warning },
  Reached: { background: colors.blueLight, foreground: colors.blue },
  In_Progress: { background: '#E8E4FA', foreground: '#5C42A5' },
  Resolved: { background: colors.primaryLight, foreground: colors.primary },
};

export function StatusChip({ status }: { status: ComplaintStatus }) {
  const selected = palette[status];
  return (
    <View style={[styles.container, { backgroundColor: selected.background }]}>
      <View style={[styles.dot, { backgroundColor: selected.foreground }]} />
      <Text style={[styles.text, { color: selected.foreground }]}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dot: {
    borderRadius: 99,
    height: 6,
    width: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
  },
});

