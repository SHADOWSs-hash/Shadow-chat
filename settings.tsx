import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  Switch,
  Alert,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useDevice } from '@/context/DeviceContext';
import { DARK, ACCENT_COLORS, AccentKey } from '@/constants/colors';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  value,
  onPress,
  dangerous,
  trailing,
  noBorder,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  dangerous?: boolean;
  trailing?: React.ReactNode;
  noBorder?: boolean;
}) {
  const { accent } = useDevice();
  const iconColor = dangerous ? DARK.danger : accent.primary;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={[styles.row, noBorder && styles.rowNoBorder]}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={styles.rowLabel}>
        <Text style={[styles.rowLabelText, dangerous && { color: DARK.danger }]}>
          {label}
        </Text>
        {value && <Text style={styles.rowValue}>{value}</Text>}
      </View>
      {trailing ?? (onPress && (
        <Ionicons name="chevron-forward" size={16} color={DARK.textMuted} />
      ))}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const {
    profile,
    accent,
    getShortId,
    updateNickname,
    updateAccentColor,
    updateDiscoveryMode,
    updateConnectionMode,
  } = useDevice();
  const insets = useSafeAreaInsets();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.nickname);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom + 80;

  const handleSaveName = () => {
    updateNickname(nameInput);
    setEditingName(false);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleCopyId = async () => {
    await Clipboard.setStringAsync(profile.deviceId);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Скопировано', 'Device ID скопирован в буфер обмена');
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: topPad }]}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.headerTitle}>Настройки</Text>

      <Animated.View entering={FadeInDown.delay(0).springify()}>
        <View style={styles.profileCard}>
          <View style={[styles.profileAvatar, { backgroundColor: profile.avatarColor + '33', borderColor: accent.primary + '60' }]}>
            <Text style={[styles.profileAvatarText, { color: profile.avatarColor }]}>
              {profile.nickname[0]?.toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  value={nameInput}
                  onChangeText={setNameInput}
                  style={[styles.nameInput, { borderColor: accent.primary }]}
                  autoFocus
                  maxLength={24}
                  onSubmitEditing={handleSaveName}
                />
                <TouchableOpacity onPress={handleSaveName}>
                  <Ionicons name="checkmark-circle" size={28} color={accent.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setNameInput(profile.nickname); setEditingName(false); }}>
                  <Ionicons name="close-circle" size={28} color={DARK.textMuted} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.nameRow}
                onPress={() => { setNameInput(profile.nickname); setEditingName(true); }}
              >
                <Text style={styles.profileName}>{profile.nickname}</Text>
                <Ionicons name="pencil" size={16} color={DARK.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.deviceIdRow} onPress={handleCopyId}>
              <Ionicons name="finger-print" size={12} color={accent.primary} />
              <Text style={[styles.deviceId, { color: accent.primary }]}>
                {getShortId()}
              </Text>
              <Ionicons name="copy-outline" size={12} color={DARK.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).springify()}>
        <Section title="ЦВЕТОВАЯ ТЕМА">
          <View style={styles.colorGrid}>
            {(Object.entries(ACCENT_COLORS) as [AccentKey, typeof ACCENT_COLORS['cyan']][]).map(
              ([key, val]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: val.primary + '22', borderColor: val.primary },
                    profile.accentColor === key && styles.colorSwatchActive,
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateAccentColor(key);
                  }}
                >
                  <View style={[styles.colorDot, { backgroundColor: val.primary }]} />
                  <Text style={[styles.colorName, { color: val.primary }]}>
                    {val.name}
                  </Text>
                  {profile.accentColor === key && (
                    <View style={[styles.colorCheck, { backgroundColor: val.primary }]}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              )
            )}
          </View>
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).springify()}>
        <Section title="ПОИСК УСТРОЙСТВ">
          <SettingRow
            icon="radio"
            label="Режим обнаружения"
            value={profile.discoveryMode === 'auto' ? 'Автоматический' : 'Ручной'}
            onPress={() =>
              updateDiscoveryMode(profile.discoveryMode === 'auto' ? 'manual' : 'auto')
            }
          />
          <SettingRow
            icon="wifi"
            label="Тип подключения"
            value={
              profile.connectionMode === 'both'
                ? 'BLE + WiFi'
                : profile.connectionMode === 'ble'
                ? 'Только BLE'
                : 'Только WiFi'
            }
            onPress={() => {
              const cycle: Record<string, 'both' | 'ble' | 'wifi'> = {
                both: 'ble',
                ble: 'wifi',
                wifi: 'both',
              };
              updateConnectionMode(cycle[profile.connectionMode] ?? 'both');
            }}
            noBorder
          />
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).springify()}>
        <Section title="УСТРОЙСТВО">
          <SettingRow
            icon="finger-print"
            label="Device ID"
            value={getShortId()}
            onPress={handleCopyId}
          />
          <SettingRow
            icon="information-circle"
            label="Полный ID"
            value={profile.deviceId.slice(0, 18) + '...'}
            onPress={handleCopyId}
            noBorder
          />
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).springify()}>
        <Section title="О ПРИЛОЖЕНИИ">
          <SettingRow icon="logo-github" label="MeshChat" value="v1.0.0" />
          <SettingRow
            icon="shield-checkmark"
            label="Шифрование"
            value="End-to-End"
          />
          <SettingRow
            icon="globe-outline"
            label="Протоколы"
            value="BLE + WiFi Direct"
            noBorder
          />
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(280).springify()}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={accent.primary} />
          <Text style={[styles.infoText, { color: DARK.textSecondary }]}>
            MeshChat работает полностью без интернета. Сообщения передаются напрямую между устройствами через Bluetooth и WiFi.
          </Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK.bg },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: DARK.textPrimary,
    letterSpacing: -0.5,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: DARK.card,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    marginBottom: 8,
  },
  profileAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  profileAvatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
  },
  profileInfo: { flex: 1, gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: DARK.textPrimary,
  },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: {
    flex: 1,
    backgroundColor: DARK.bgSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: DARK.textPrimary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    borderWidth: 1.5,
  },
  deviceIdRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  deviceId: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    letterSpacing: 1.5,
  },
  section: { marginHorizontal: 16, marginBottom: 8 },
  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: DARK.textMuted,
    letterSpacing: 1.2,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  sectionCard: {
    backgroundColor: DARK.card,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: DARK.border,
  },
  rowNoBorder: { borderBottomWidth: 0 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, gap: 2 },
  rowLabelText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: DARK.textPrimary,
  },
  rowValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: DARK.textSecondary,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 10,
  },
  colorSwatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    flex: 1,
    minWidth: '45%',
    position: 'relative',
  },
  colorSwatchActive: { borderWidth: 2 },
  colorDot: { width: 16, height: 16, borderRadius: 8 },
  colorName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, flex: 1 },
  colorCheck: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: DARK.card,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    padding: 14,
    backgroundColor: DARK.card,
    borderRadius: 14,
  },
  infoText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
});
