import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useDevice } from '@/context/DeviceContext';
import { useMesh, Peer, Channel } from '@/context/MeshContext';
import { DARK } from '@/constants/colors';

type ConversationItem =
  | { kind: 'peer'; data: Peer }
  | { kind: 'channel'; data: Channel };

function SignalBars({ rssi, color }: { rssi: number; color: string }) {
  const strength = rssi > -60 ? 3 : rssi > -75 ? 2 : 1;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
      {[1, 2, 3].map((bar) => (
        <View
          key={bar}
          style={{
            width: 3,
            height: 4 + bar * 3,
            borderRadius: 1,
            backgroundColor: bar <= strength ? color : DARK.border,
          }}
        />
      ))}
    </View>
  );
}

function ConversationRow({
  item,
  index,
}: {
  item: ConversationItem;
  index: number;
}) {
  const { accent } = useDevice();
  const { messages, unreadFor, markRead } = useMesh();
  const scale = useSharedValue(1);

  const id = item.kind === 'peer' ? item.data.id : item.data.id;
  const name = item.kind === 'peer' ? item.data.name : `# ${item.data.name}`;
  const convMsgs = messages[id] ?? [];
  const lastMsg = convMsgs[convMsgs.length - 1];
  const unread = unreadFor(id);
  const isPeer = item.kind === 'peer';
  const peer = isPeer ? (item.data as Peer) : null;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.97, { duration: 100 }, () => {
      scale.value = withSpring(1, { duration: 150 });
    });
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markRead(id);
    router.push({ pathname: '/chat/[id]', params: { id, name } });
  };

  const avatarLetter = (isPeer ? peer?.name : item.data.name)?.[0]?.toUpperCase() ?? '?';
  const avatarColor = isPeer ? accent.secondary : accent.primary;

  const timeStr = lastMsg
    ? new Date(lastMsg.timestamp).toLocaleTimeString('ru', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()} style={animStyle}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        style={styles.row}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor + '33' }]}>
          <Text style={[styles.avatarText, { color: avatarColor }]}>
            {avatarLetter}
          </Text>
          {isPeer && peer && (
            <View
              style={[
                styles.statusDot,
                { backgroundColor: peer.isMeshDevice ? accent.primary : DARK.textMuted },
              ]}
            />
          )}
        </View>

        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <Text style={styles.rowName} numberOfLines={1}>
              {name}
            </Text>
            <View style={styles.rowMeta}>
              {isPeer && peer && (
                <SignalBars rssi={peer.rssi} color={accent.primary} />
              )}
              {timeStr ? (
                <Text style={styles.rowTime}>{timeStr}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.rowBottom}>
            <Text style={styles.rowPreview} numberOfLines={1}>
              {lastMsg
                ? lastMsg.isOwn
                  ? `Вы: ${lastMsg.content}`
                  : lastMsg.content
                : isPeer
                ? peer?.isMeshDevice
                  ? 'MeshChat устройство'
                  : 'BLE устройство'
                : 'Канал'}
            </Text>
            {unread > 0 && (
              <View style={[styles.badge, { backgroundColor: accent.primary }]}>
                <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ChatsScreen() {
  const { accent, profile } = useDevice();
  const { knownPeers, channels, messages } = useMesh();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom + 80;

  const hasConversations = (id: string) => (messages[id]?.length ?? 0) > 0;

  const items: ConversationItem[] = [
    ...channels.map((c): ConversationItem => ({ kind: 'channel', data: c })),
    ...knownPeers.map((p): ConversationItem => ({ kind: 'peer', data: p })),
  ];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MeshChat</Text>
        <View style={styles.headerRight}>
          <View style={[styles.statusPill, { borderColor: accent.primary + '60' }]}>
            <View style={[styles.statusDotInline, { backgroundColor: accent.primary }]} />
            <Text style={[styles.statusText, { color: accent.primary }]}>
              {profile.connectionMode === 'ble' ? 'BLE' : profile.connectionMode === 'wifi' ? 'WiFi' : 'BLE+WiFi'}
            </Text>
          </View>
        </View>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="radio-outline" size={64} color={DARK.textMuted} />
          <Text style={styles.emptyTitle}>Нет соединений</Text>
          <Text style={styles.emptyText}>
            Перейдите во вкладку Поиск, чтобы найти ближайшие устройства через Bluetooth или WiFi
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { borderColor: accent.primary }]}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Ionicons name="search" size={18} color={accent.primary} />
            <Text style={[styles.emptyBtnText, { color: accent.primary }]}>
              Найти устройства
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) =>
            item.kind === 'peer' ? item.data.id : item.data.id
          }
          renderItem={({ item, index }) => (
            <ConversationRow item={item} index={index} />
          )}
          contentContainerStyle={{ paddingBottom: bottomPad, paddingTop: 8 }}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { marginLeft: 76 }]} />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK.bg,
  },
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDotInline: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: DARK.bg,
  },
  rowContent: { flex: 1, gap: 4 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: DARK.textPrimary,
    flex: 1,
  },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: DARK.textMuted,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowPreview: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: DARK.textSecondary,
    flex: 1,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#fff',
  },
  separator: {
    height: 1,
    backgroundColor: DARK.border,
    marginRight: 0,
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
    fontSize: 22,
    color: DARK.textPrimary,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: DARK.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
});
