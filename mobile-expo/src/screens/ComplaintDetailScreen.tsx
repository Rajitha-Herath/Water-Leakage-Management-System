import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { SectionCard } from '../components/SectionCard';
import { StatusChip } from '../components/StatusChip';
import { ApiError, api } from '../services/api';
import { queueStatusUpdate } from '../services/offline';
import { colors } from '../theme';
import type {
  Complaint,
  ComplaintStatus,
  PhotoAsset,
  StatusHistory,
} from '../types';
import {
  complaintCoordinates,
  nextStatus,
  statusLabel,
} from '../types';
import { distanceInMeters } from '../utils/geo';

interface ComplaintDetailScreenProps {
  complaintId: string;
  onBack: () => void;
}

function photoFromPicker(asset: ImagePicker.ImagePickerAsset): PhotoAsset {
  const uriName = asset.uri.split('/').pop()?.split('?')[0];
  return {
    uri: asset.uri,
    fileName: asset.fileName || uriName || `completion_${Date.now()}.jpg`,
    mimeType: asset.mimeType || 'image/jpeg',
  };
}

export function ComplaintDetailScreen({
  complaintId,
  onBack,
}: ComplaintDetailScreenProps) {
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<PhotoAsset | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setComplaint(await api.getComplaint(complaintId));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load complaint details.',
      );
    } finally {
      setLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function capturePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Camera permission required',
        'Allow camera access to capture the completion photograph.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) setPhoto(photoFromPicker(result.assets[0]));
  }

  async function choosePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) setPhoto(photoFromPicker(result.assets[0]));
  }

  async function arrivalGpsNote(item: Complaint): Promise<string> {
    if (!(await Location.hasServicesEnabledAsync())) {
      throw new Error('Enable phone location services before recording arrival.');
    }

    let permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted) {
      permission = await Location.requestForegroundPermissionsAsync();
    }
    if (!permission.granted) {
      throw new Error('Location permission is required to record site arrival.');
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const destination = complaintCoordinates(item);
    const distance = distanceInMeters(
      current.coords.latitude,
      current.coords.longitude,
      destination.latitude,
      destination.longitude,
    );
    return `Arrival GPS ${current.coords.latitude.toFixed(6)}, ${current.coords.longitude.toFixed(6)}; approximately ${distance}m from reported point.`;
  }

  async function applyNextStatus() {
    if (!complaint) return;
    const next = nextStatus(complaint.status);
    if (!next) return;

    if (next === 'Resolved' && !notes.trim()) {
      Alert.alert('Resolution notes required', 'Enter repair and resolution notes.');
      return;
    }
    if (next === 'Resolved' && !photo) {
      Alert.alert(
        'Completion photo required',
        'Capture or select a completion photograph before resolving.',
      );
      return;
    }

    setSaving(true);
    try {
      const statusNotes = next === 'Reached' ? await arrivalGpsNote(complaint) : notes.trim();

      try {
        if (next === 'Resolved' && photo) {
          await api.uploadResolutionPhoto(complaint._id, photo);
        }
        await api.updateStatus(complaint._id, next, statusNotes);
        setNotes('');
        setPhoto(null);
        await load();
        Alert.alert('Complaint updated', `Status changed to ${statusLabel(next)}.`);
      } catch (updateError) {
        if (updateError instanceof ApiError) throw updateError;

        await queueStatusUpdate({
          complaintId: complaint._id,
          status: next,
          notes: statusNotes,
          photo: next === 'Resolved' ? photo ?? undefined : undefined,
        });
        Alert.alert(
          'Saved offline',
          'The update is saved on this phone. Press the sync icon after connectivity returns.',
          [{ text: 'OK', onPress: onBack }],
        );
      }
    } catch (updateError) {
      Alert.alert(
        'Update failed',
        updateError instanceof Error
          ? updateError.message
          : 'The complaint could not be updated.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function navigateToComplaint(item: Complaint) {
    const coordinates = complaintCoordinates(item);
    await Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${coordinates.latitude},${coordinates.longitude}`,
    );
  }

  async function callCitizen(item: Complaint) {
    const phoneNumber = item.citizen?.phoneNumber?.trim();
    if (!phoneNumber) {
      Alert.alert('No phone number', 'This complaint has no citizen phone number.');
      return;
    }
    await Linking.openURL(`tel:${phoneNumber}`);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back to assigned complaints"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.text} name="arrow-back" size={23} />
        </Pressable>
        <Text style={styles.headerTitle}>Complaint details</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.centered}>
          <Ionicons color={colors.muted} name="cloud-offline-outline" size={52} />
          <Text style={styles.errorTitle}>Unable to load complaint</Text>
          <Text style={styles.errorText}>{error}</Text>
          <ActionButton
            icon="refresh"
            label="Try again"
            onPress={() => void load()}
            style={styles.retryButton}
            variant="outline"
          />
        </View>
      ) : null}

      {!loading && complaint ? (
        <ComplaintContent
          complaint={complaint}
          notes={notes}
          onCall={() => void callCitizen(complaint)}
          onCapturePhoto={() => void capturePhoto()}
          onChoosePhoto={() => void choosePhoto()}
          onNavigate={() => void navigateToComplaint(complaint)}
          onNotesChange={setNotes}
          onUpdate={() => void applyNextStatus()}
          photo={photo}
          saving={saving}
        />
      ) : null}
    </SafeAreaView>
  );
}

interface ComplaintContentProps {
  complaint: Complaint;
  notes: string;
  photo: PhotoAsset | null;
  saving: boolean;
  onNotesChange: (value: string) => void;
  onCapturePhoto: () => void;
  onChoosePhoto: () => void;
  onNavigate: () => void;
  onCall: () => void;
  onUpdate: () => void;
}

function ComplaintContent({
  complaint,
  notes,
  photo,
  saving,
  onNotesChange,
  onCapturePhoto,
  onChoosePhoto,
  onNavigate,
  onCall,
  onUpdate,
}: ComplaintContentProps) {
  const next = nextStatus(complaint.status);
  const photographs = complaint.photos ?? [];
  const history = complaint.history ?? [];

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.identifierRow}>
        <Text style={styles.publicId}>{complaint.publicId}</Text>
        <StatusChip status={complaint.status} />
      </View>
      <Text style={styles.description}>{complaint.description}</Text>

      <View style={styles.tags}>
        <Tag icon="alert-circle-outline" text={complaint.priority} />
        <Tag icon="build-outline" text={complaint.category} />
        <Tag icon="chatbubble-outline" text={complaint.source} />
      </View>

      <SectionCard title="Location and citizen">
        <InfoRow
          icon="location-outline"
          subtitle={complaint.area || 'Unspecified'}
          title={complaint.address || 'No address supplied'}
        />
        <View style={styles.divider} />
        <InfoRow
          icon="call-outline"
          subtitle="Citizen contact"
          title={complaint.citizen?.phoneNumber || 'Not provided'}
        />
        <View style={styles.twoButtons}>
          <ActionButton
            icon="navigate-outline"
            label="Navigate"
            onPress={onNavigate}
            style={styles.flexButton}
            variant="outline"
          />
          <ActionButton
            icon="call-outline"
            label="Call citizen"
            onPress={onCall}
            style={styles.flexButton}
            variant="outline"
          />
        </View>
      </SectionCard>

      {photographs.length > 0 ? (
        <SectionCard title="Evidence photographs">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.photoRow}>
              {photographs.map((item, index) => (
                <View key={item._id ?? `${item.url}-${index}`}>
                  <Image
                    source={{ uri: api.absolutePhotoUrl(item.url) }}
                    style={styles.evidencePhoto}
                  />
                  <Text style={styles.photoType}>
                    {item.type === 'resolution' ? 'Completion' : 'Complaint'}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </SectionCard>
      ) : null}

      <SectionCard title="Progress history">
        {history.length > 0 ? (
          history.map((item, index) => (
            <HistoryItem
              item={item}
              key={`${item.status}-${item.changedAt ?? index}`}
              last={index === history.length - 1}
            />
          ))
        ) : (
          <Text style={styles.mutedText}>No history is available.</Text>
        )}
      </SectionCard>

      {next ? (
        <SectionCard title={`Next action: ${statusLabel(next)}`}>
          {next === 'Reached' ? (
            <View style={styles.notice}>
              <Ionicons color={colors.blue} name="location" size={18} />
              <Text style={styles.noticeText}>
                Your current GPS position will be recorded as the arrival note.
              </Text>
            </View>
          ) : null}

          {next === 'Resolved' ? (
            <>
              <Text style={styles.fieldLabel}>Repair and resolution notes</Text>
              <TextInput
                multiline
                onChangeText={onNotesChange}
                placeholder="Describe the repair completed..."
                placeholderTextColor="#9AA7A2"
                style={styles.notesInput}
                textAlignVertical="top"
                value={notes}
              />

              {photo ? <Image source={{ uri: photo.uri }} style={styles.completionPhoto} /> : null}

              <View style={styles.twoButtons}>
                <ActionButton
                  icon="camera-outline"
                  label={photo ? 'Retake' : 'Take photo'}
                  onPress={onCapturePhoto}
                  style={styles.flexButton}
                  variant="outline"
                />
                <ActionButton
                  icon="images-outline"
                  label="Choose photo"
                  onPress={onChoosePhoto}
                  style={styles.flexButton}
                  variant="outline"
                />
              </View>
            </>
          ) : null}

          <ActionButton
            icon="arrow-forward"
            label={saving ? 'Saving...' : `Mark as ${statusLabel(next)}`}
            loading={saving}
            onPress={onUpdate}
            style={styles.updateButton}
          />
        </SectionCard>
      ) : null}

      {complaint.status === 'Resolved' && complaint.resolutionNotes ? (
        <SectionCard title="Resolution">
          <Text style={styles.resolutionText}>{complaint.resolutionNotes}</Text>
        </SectionCard>
      ) : null}
    </ScrollView>
  );
}

function Tag({ text, icon }: { text: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.tag}>
      <Ionicons color={colors.muted} name={icon} size={14} />
      <Text style={styles.tagText}>{text || 'Unspecified'}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons color={colors.primary} name={icon} size={21} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function HistoryItem({ item, last }: { item: StatusHistory; last: boolean }) {
  const date = item.changedAt ? new Date(item.changedAt) : null;
  return (
    <View style={styles.historyRow}>
      <View style={styles.timeline}>
        <View style={styles.timelineDot} />
        {!last ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={[styles.historyContent, last && styles.historyLast]}>
        <Text style={styles.historyStatus}>{statusLabel(item.status)}</Text>
        {date && !Number.isNaN(date.getTime()) ? (
          <Text style={styles.historyDate}>{date.toLocaleString()}</Text>
        ) : null}
        {item.notes ? <Text style={styles.historyNotes}>{item.notes}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: '#E4EBE8',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  pressed: { opacity: 0.6 },
  headerTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  headerSpacer: { width: 42 },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 13,
  },
  errorText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 17,
    minWidth: 150,
  },
  content: {
    gap: 15,
    paddingBottom: 38,
    paddingHorizontal: 17,
    paddingTop: 13,
  },
  identifierRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  publicId: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '900',
  },
  description: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 29,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  tag: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: '#E6ECE9',
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  tagText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
  },
  infoIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 11,
    height: 41,
    justifyContent: 'center',
    width: 41,
  },
  infoText: { flex: 1 },
  infoTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  infoSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    backgroundColor: '#E7ECEA',
    height: 1,
    marginVertical: 13,
  },
  twoButtons: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
  },
  flexButton: { flex: 1 },
  photoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  evidencePhoto: {
    backgroundColor: '#E9EEEC',
    borderRadius: 11,
    height: 130,
    width: 165,
  },
  photoType: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 5,
  },
  historyRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: 10,
  },
  timeline: {
    alignItems: 'center',
    width: 15,
  },
  timelineDot: {
    backgroundColor: colors.primary,
    borderColor: '#BCE4D6',
    borderRadius: 99,
    borderWidth: 3,
    height: 14,
    width: 14,
  },
  timelineLine: {
    backgroundColor: '#DBE7E2',
    flex: 1,
    minHeight: 31,
    width: 2,
  },
  historyContent: {
    flex: 1,
    paddingBottom: 15,
  },
  historyLast: { paddingBottom: 0 },
  historyStatus: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  historyDate: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  historyNotes: {
    color: '#55635E',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  mutedText: {
    color: colors.muted,
    fontSize: 13,
  },
  notice: {
    alignItems: 'flex-start',
    backgroundColor: colors.blueLight,
    borderRadius: 11,
    flexDirection: 'row',
    gap: 8,
    padding: 11,
  },
  noticeText: {
    color: colors.blue,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 7,
  },
  notesInput: {
    backgroundColor: '#F9FBFA',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    minHeight: 105,
    padding: 12,
  },
  completionPhoto: {
    backgroundColor: '#E9EEEC',
    borderRadius: 12,
    height: 180,
    marginTop: 12,
    width: '100%',
  },
  updateButton: { marginTop: 14 },
  resolutionText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
});

