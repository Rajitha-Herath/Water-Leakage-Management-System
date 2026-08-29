import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import type { Complaint } from '../types';
import { StatusChip } from './StatusChip';

export function ComplaintCard({
  complaint,
  onPress,
}: {
  complaint: Complaint;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <Text style={styles.publicId}>{complaint.publicId}</Text>
        <StatusChip status={complaint.status} />
      </View>
      <Text numberOfLines={2} style={styles.description}>
        {complaint.description}
      </Text>
      <View style={styles.locationRow}>
        <Ionicons color={colors.muted} name="location-outline" size={17} />
        <Text numberOfLines={1} style={styles.location}>
          {complaint.area || 'Unspecified'} · {complaint.address || 'No address'}
        </Text>
        <Ionicons color="#8A9792" name="chevron-forward" size={18} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: '#E6ECE9',
    borderRadius: 17,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  pressed: {
    opacity: 0.72,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  publicId: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  description: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 11,
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 13,
  },
  location: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
  },
});

