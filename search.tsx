import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useDevice } from '@/context/DeviceContext';
import { useMesh, Peer } from '@/context/MeshContext';
import { DARK } from '@/constants/colors';

function ScanningPulse({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.4, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0, { duration: 800 }), withTiming(0.7, { duration: 800 })),
      -1,
      false
    );
  }, []);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(scale.value, [1, 1.4], [1, 1.7]) }],
    opacity: interpolate(opacity.value, [0, 0.7], [0.7, 0]),
  }));

  return (
    <View style={styles.pulseContainer}>
      <Animated.View
        style={[styles.pulseRing, { borderColor: color }, ring2Style]}
      />
      <Animated.View
        style={[styles.pulseRing, { borderColor: color }, ring1Style]}
      />
      <View style={[styles.pulseCore, { backgroundColor: color + '30' }]}>
        <Ionicons name="bluetooth" size={28} color={color} />
      </View>
    </View>
  );
}

function SignalBars({ rssi, color }: { rssi: number; color: string }) {
  const strength = rssi > -60 ? 3 : rssi > -75 ? 2 : 1;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
      {[1, 2, 3].map((bar) => (
        <View
          key={bar}
          style={{
            width: 4,
            height: 4 + bar * 4,
            borderRadius: 1.5,
            backgroundColor: bar <= strength ? color : DARK.border,
          }}
        />
      ))}
    </View>
  );
}

function PeerCard({ peer, index }: { peer: Peer; index: number }) {
  const { accent, profile } = useDevice();
  const { markRead } = useMesh();

  const handlePress = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markRead(peer.id);
    router.push({ pathname: '/chat/[id]', params: { id: peer.id, name: peer.name } });
  };

  const isMesh = peer.isMeshDevice;
  const cardColor = isMesh ? accent.primary : DARK.textMuted;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        style={[
          styles.peerCard,
          isMesh && { borderColor: accent.primary + '40', borderWidth: 1 },
        ]}
      >
        <View style={[styles.peerAvatar, { backgroundColor: cardColor + '22' }]}>
          <Ionicons
            name={peer.discoveryType === 'wifi' ? 'wifi' : 'bluetooth'}
            size={20}
            color={cardColor}
          />
          {isMesh && (
            <View style={[styles.meshBadge, { backgroundColor: accent.primary }]}>
              <Ionicons name="checkmark" size={8} color="#fff" />
            </View>
          )}
        </View>

        <View style={styles.peerInfo}>
          <View style={styles.peerTop}>
            <Text style={styles.peerName} numberOfLines={1}>
              {peer.name}
            </Text>
            {isMesh && (
              <View style={[styles.meshTag, { backgroundColor: accent.bubble }]}>
                <Text style={[styles.meshTagText, { color: accent.primary }]}>
                  MeshChat
                </Text>
              </View>
            )}
          </View>
          <View style={styles.peerBottom}>
            <Text style={styles.peerId}>
              {peer.meshId ? `ID: ${peer.meshId.slice(0, 8).toUpperCase()}` : `${peer.id.slice(-8).toUpperCase()}`}
            </Text>
            <View style={styles.peerMeta}>
              <SignalBars rssi={peer.rssi} color={cardColor} />
              <Text style={[styles.peerRssi, { color: cardColor }]}>
                {peer.rssi} dBm
              </Text>
            </View>
          </View>
        </View>

        {isMesh && (
          <View style={[styles.chatBtn, { backgroundColor: accent.bubble }]}>
            <Ionicons name="chatbubble" size={18} color={accent.primary} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function ManualAddModal({
  visible,
  onClose,
  onAdd,
  accent,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (id: string) => void;
  accent: { primary: string; bubble: string };
}) {
  const [meshId, setMeshId] = useState('');
  const insets = useSafeAreaInsets();

  const handleAdd = () => {
    if (!meshId.trim()) return;
    onAdd(meshId.trim().toUpperCase());
    setMeshId('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}
        >
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Добавить устройство</Text>
          <Text style={styles.modalSubtitle}>
            Введите Device ID другого пользователя MeshChat для прямого подключения
          </Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>DEVICE ID</Text>
            <TextInput
              value={meshId}
              onChangeText={setMeshId}
              placeholder="Например: A1B2C3D4"
              placeholderTextColor={DARK.textMuted}
              style={[styles.input, { borderColor: meshId ? accent.primary : DARK.border }]}
              autoCapitalize="characters"
              autoFocus
              maxLength={36}
            />
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: meshId.trim() ? accent.primary : DARK.border }]}
              onPress={handleAdd}
              disabled={!meshId.trim()}
            >
              <Text style={styles.createText}>Добавить</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

type ConnMode = 'both' | 'ble' | 'wifi';
type ScanMode = 'auto' | 'manual';

export default function SearchScreen() {
  const { accent, profile, updateConnectionMode, updateDiscoveryMode } = useDevice();
  const { peers, knownPeers, isScanning, bleState, scanError, startScan, stopScan, addPeerManually } = useMesh();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [tab, setTab] = useState<'live' | 'known'>('live');
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom + 80;

  useEffect(() => {
    if (profile.discoveryMode === 'auto') {
      startScan();
      autoTimerRef.current = setInterval(() => {
        startScan();
      }, 20000);
    }
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      stopScan();
    };
  }, [profile.discoveryMode]);

  const livePeers = peers.filter((p) =>
    query ? p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.meshId ?? '').toLowerCase().includes(query.toLowerCase()) : true
  );

  const knownFiltered = knownPeers.filter((p) =>
    query ? p.name.toLowerCase().includes(query.toLowerCase()) : true
  );

  const displayPeers = tab === 'live' ? livePeers : knownFiltered;

  const bleOn = bleState === 'PoweredOn' || Platform.OS === 'web';

  const handleScanToggle = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isScanning) stopScan();
    else startScan();
  };

  const handleConnMode = (mode: ConnMode) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateConnectionMode(mode);
  };

  const handleDiscoveryMode = (mode: ScanMode) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateDiscoveryMode(mode);
    if (mode === 'auto') startScan();
    else stopScan();
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Поиск устройств</Text>
        <TouchableOpacity
          style={[styles.manualBtn, { backgroundColor: accent.bubble }]}
          onPress={() => setShowManual(true)}
        >
          <Ionicons name="person-add" size={18} color={accent.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={DARK.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Имя или ID устройства"
          placeholderTextColor={DARK.textMuted}
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={DARK.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.controlRow}>
        <View style={styles.segControl}>
          {(['both', 'ble', 'wifi'] as ConnMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.segBtn,
                profile.connectionMode === mode && {
                  backgroundColor: accent.primary,
                },
              ]}
              onPress={() => handleConnMode(mode)}
            >
              <Ionicons
                name={mode === 'wifi' ? 'wifi' : mode === 'ble' ? 'bluetooth' : 'radio'}
                size={14}
                color={profile.connectionMode === mode ? '#fff' : DARK.textSecondary}
              />
              <Text
                style={[
                  styles.segText,
                  profile.connectionMode === mode
                    ? { color: '#fff' }
                    : { color: DARK.textSecondary },
                ]}
              >
                {mode === 'both' ? 'Все' : mode === 'ble' ? 'BLE' : 'WiFi'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.segControl}>
          {(['auto', 'manual'] as ScanMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.segBtn,
                profile.discoveryMode === mode && {
                  backgroundColor: accent.primary,
                },
              ]}
              onPress={() => handleDiscoveryMode(mode)}
            >
              <Text
                style={[
                  styles.segText,
                  profile.discoveryMode === mode
                    ? { color: '#fff' }
                    : { color: DARK.textSecondary },
                ]}
              >
                {mode === 'auto' ? 'Авто' : 'Ручной'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.tabRow}>
        {(['live', 'known'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { borderBottomColor: accent.primary }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && { color: accent.primary }]}>
              {t === 'live' ? `Обнаружено (${livePeers.length})` : `Известные (${knownPeers.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isScanning && tab === 'live' && (
        <Animated.View entering={FadeIn} style={styles.scanningBanner}>
          <ScanningPulse color={accent.primary} />
          <View style={{ gap: 4 }}>
            <Text style={[styles.scanningTitle, { color: accent.primary }]}>
              Сканирование...
            </Text>
            <Text style={styles.scanningSubtitle}>
              Ищем ближайшие устройства по Bluetooth
            </Text>
          </View>
        </Animated.View>
      )}

      {scanError && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={16} color={DARK.danger} />
          <Text style={styles.errorText}>{scanError}</Text>
        </View>
      )}

      {displayPeers.length === 0 && !isScanning ? (
        <View style={styles.empty}>
          <Ionicons
            name={tab === 'live' ? 'bluetooth-outline' : 'people-outline'}
            size={56}
            color={DARK.textMuted}
          />
          <Text style={styles.emptyTitle}>
            {tab === 'live' ? 'Устройств не найдено' : 'Нет известных устройств'}
          </Text>
          <Text style={styles.emptyText}>
            {tab === 'live'
              ? Platform.OS === 'web'
                ? 'BLE доступен только на мобильных устройствах'
                : 'Включите Bluetooth и нажмите «Сканировать»'
              : 'Обнаруженные устройства появятся здесь'}
          </Text>
          {Platform.OS !== 'web' && tab === 'live' && (
            <TouchableOpacity
              style={[styles.scanBtn, { backgroundColor: accent.primary }]}
              onPress={handleScanToggle}
            >
              <Ionicons name="search" size={18} color="#fff" />
              <Text style={styles.scanBtnText}>Сканировать</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={displayPeers}
          keyExtractor={(p) => p.id}
          renderItem={({ item, index }) => <PeerCard peer={item} index={index} />}
          contentContainerStyle={{
            paddingBottom: bottomPad,
            paddingHorizontal: 16,
            paddingTop: 8,
            gap: 8,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {Platform.OS !== 'web' && profile.discoveryMode === 'manual' && !isScanning && (
        <View style={[styles.fabContainer, { bottom: bottomPad - 40 }]}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: accent.primary }]}
            onPress={handleScanToggle}
          >
            <Ionicons name="search" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {Platform.OS !== 'web' && isScanning && profile.discoveryMode === 'manual' && (
        <View style={[styles.fabContainer, { bottom: bottomPad - 40 }]}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: DARK.danger }]}
            onPress={handleScanToggle}
          >
            <Ionicons name="stop" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <ManualAddModal
        visible={showManual}
        onClose={() => setShowManual(false)}
        onAdd={addPeerManually}
        accent={accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 8,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: DARK.textPrimary,
    letterSpacing: -0.5,
  },
  manualBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK.card,
    marginHorizontal: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: DARK.textPrimary,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    padding: 0,
  },
  controlRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 4,
  },
  segControl: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: DARK.card,
    borderRadius: 10,
    padding: 3,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 8,
  },
  segText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: DARK.border,
    marginTop: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: DARK.textMuted,
  },
  scanningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: DARK.card,
    borderRadius: 16,
  },
  pulseContainer: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
  },
  pulseCore: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  scanningSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: DARK.textSecondary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: DARK.danger + '20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DARK.danger + '40',
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: DARK.danger,
  },
  peerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK.card,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  peerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meshBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: DARK.card,
  },
  peerInfo: { flex: 1, gap: 5 },
  peerTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  peerName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: DARK.textPrimary,
    flex: 1,
  },
  meshTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  meshTagText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  peerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  peerId: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: DARK.textMuted,
    letterSpacing: 0.5,
  },
  peerMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  peerRssi: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  chatBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: DARK.textPrimary,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: DARK.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 8,
  },
  scanBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' },
  fabContainer: {
    position: 'absolute',
    right: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: DARK.bgSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: DARK.border,
    alignSelf: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: DARK.textPrimary,
  },
  modalSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: DARK.textSecondary,
    marginTop: -8,
    lineHeight: 20,
  },
  inputGroup: { gap: 8 },
  inputLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: DARK.textMuted,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: DARK.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: DARK.textPrimary,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    borderWidth: 1,
    borderColor: DARK.border,
  },
  modalActions: { flexDirection: 'row', gap: 12, paddingTop: 8 },
  cancelBtn: {
    flex: 1,
    backgroundColor: DARK.card,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: DARK.textSecondary,
  },
  createBtn: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  createText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' },
});
