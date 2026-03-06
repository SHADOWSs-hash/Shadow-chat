import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useDevice } from '@/context/DeviceContext';
import { useMesh, Message } from '@/context/MeshContext';
import { DARK } from '@/constants/colors';

function MessageBubble({ msg, index }: { msg: Message; index: number }) {
  const { accent } = useDevice();

  const timeStr = new Date(msg.timestamp).toLocaleTimeString('ru', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (msg.isOwn) {
    return (
      <Animated.View
        entering={FadeInDown.delay(Math.min(index * 20, 300)).springify()}
        style={styles.ownRow}
      >
        <View style={[styles.ownBubble, { backgroundColor: accent.primary + '22', borderColor: accent.primary + '40' }]}>
          <Text style={[styles.bubbleText, { color: DARK.textPrimary }]}>{msg.content}</Text>
          <View style={styles.bubbleMeta}>
            <Text style={styles.bubbleTime}>{timeStr}</Text>
            <Ionicons
              name={msg.status === 'delivered' ? 'checkmark-done' : 'checkmark'}
              size={12}
              color={accent.primary}
            />
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 20, 300)).springify()}
      style={styles.theirRow}
    >
      <View style={styles.theirAvatar}>
        <Text style={styles.theirAvatarText}>{msg.senderName[0]?.toUpperCase()}</Text>
      </View>
      <View>
        <Text style={styles.theirName}>{msg.senderName}</Text>
        <View style={styles.theirBubble}>
          <Text style={styles.bubbleText}>{msg.content}</Text>
          <View style={styles.bubbleMeta}>
            <Text style={styles.bubbleTime}>{timeStr}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function DateSeparator({ date }: { date: Date }) {
  const isToday = new Date().toDateString() === date.toDateString();
  const label = isToday
    ? 'Сегодня'
    : date.toLocaleDateString('ru', { day: 'numeric', month: 'long' });

  return (
    <View style={styles.dateSep}>
      <View style={styles.dateLine} />
      <Text style={styles.dateText}>{label}</Text>
      <View style={styles.dateLine} />
    </View>
  );
}

export default function ChatScreen() {
  const { id, name, isChannel } = useLocalSearchParams<{
    id: string;
    name: string;
    isChannel?: string;
  }>();
  const { accent, profile } = useDevice();
  const { getConversationMessages, sendMessage, sendChannelMessage, knownPeers, channels, markRead } =
    useMesh();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const sendScale = useSharedValue(1);
  const listRef = useRef<FlatList>(null);

  const convId = id ?? '';
  const convName = name ?? 'Чат';
  const channel = isChannel === '1' ? channels.find((c) => c.id === convId) : null;
  const peer = !channel ? knownPeers.find((p) => p.id === convId) : null;

  const messages = getConversationMessages(convId);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    markRead(convId);
  }, [convId]);

  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    const content = text;
    setText('');
    sendScale.value = withSpring(0.9, { duration: 80 }, () => {
      sendScale.value = withSpring(1, { duration: 120 });
    });
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isChannel === '1') {
      sendChannelMessage(convId, content);
    } else {
      sendMessage(convId, content);
    }
  }, [text, convId, isChannel]);

  const sendBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  const groupedMessages = messages.reduce<{ date: string; msgs: Message[] }[]>(
    (acc, msg) => {
      const d = new Date(msg.timestamp).toDateString();
      const last = acc[acc.length - 1];
      if (!last || last.date !== d) acc.push({ date: d, msgs: [msg] });
      else last.msgs.push(msg);
      return acc;
    },
    []
  );

  const flatItems: Array<{ type: 'date'; date: string } | { type: 'msg'; msg: Message; index: number }> = [];
  let globalIdx = 0;
  for (const group of groupedMessages) {
    flatItems.push({ type: 'date', date: group.date });
    for (const msg of group.msgs) {
      flatItems.push({ type: 'msg', msg, index: globalIdx++ });
    }
  }

  const isConnected = peer?.isMeshDevice ?? !!channel;
  const statusLabel = channel
    ? `${channel.members.length} участников`
    : peer?.isMeshDevice
    ? `MeshChat · ${Math.round(Math.abs(peer.rssi ?? -80))} м`
    : peer
    ? 'BLE устройство'
    : 'Устройство';

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={DARK.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={[styles.headerAvatar, { backgroundColor: accent.primary + '20' }]}>
            <Ionicons
              name={channel ? 'radio' : 'bluetooth'}
              size={18}
              color={accent.primary}
            />
          </View>
          <View>
            <Text style={styles.headerName}>
              {channel ? `# ${convName}` : convName}
            </Text>
            <View style={styles.headerStatusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isConnected ? accent.primary : DARK.textMuted },
                ]}
              />
              <Text style={styles.headerStatus}>{statusLabel}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="information-circle-outline" size={24} color={DARK.textSecondary} />
        </TouchableOpacity>
      </View>

      {!isConnected && !channel && (
        <Animated.View entering={FadeInUp} style={styles.warningBar}>
          <Ionicons name="warning-outline" size={14} color={DARK.warning} />
          <Text style={styles.warningText}>
            Устройство не является MeshChat — сообщения сохранятся локально
          </Text>
        </Animated.View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={flatItems}
          keyExtractor={(item, i) =>
            item.type === 'date' ? `date-${item.date}` : `msg-${item.msg.id}`
          }
          renderItem={({ item }) => {
            if (item.type === 'date') {
              return <DateSeparator date={new Date(item.date)} />;
            }
            return <MessageBubble msg={item.msg} index={item.index} />;
          }}
          contentContainerStyle={[
            styles.messageList,
            { paddingBottom: 12 },
          ]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (flatItems.length > 0) {
              listRef.current?.scrollToEnd({ animated: false });
            }
          }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View style={[styles.emptyChatIcon, { backgroundColor: accent.bubble }]}>
                <Ionicons name="chatbubbles-outline" size={32} color={accent.primary} />
              </View>
              <Text style={styles.emptyChatTitle}>Нет сообщений</Text>
              <Text style={styles.emptyChatText}>
                Начните разговор. Сообщения будут переданы напрямую без интернета.
              </Text>
            </View>
          }
        />

        <View style={[styles.inputBar, { paddingBottom: bottomPad + 8 }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Сообщение..."
              placeholderTextColor={DARK.textMuted}
              style={styles.input}
              multiline
              maxLength={2000}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              blurOnSubmit={false}
            />
          </View>
          <Animated.View style={sendBtnStyle}>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: text.trim() ? accent.primary : DARK.card },
              ]}
              onPress={handleSend}
              disabled={!text.trim()}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={text.trim() ? '#fff' : DARK.textMuted}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: DARK.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: DARK.textPrimary,
  },
  headerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  headerStatus: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: DARK.textSecondary,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    backgroundColor: DARK.warning + '18',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DARK.warning + '40',
  },
  warningText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: DARK.warning,
    flex: 1,
  },
  messageList: { paddingHorizontal: 16, paddingTop: 12, gap: 4 },
  ownRow: { alignItems: 'flex-end', marginBottom: 2 },
  ownBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 4,
  },
  theirRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 2,
  },
  theirAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DARK.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  theirAvatarText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: DARK.textSecondary,
  },
  theirName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: DARK.textMuted,
    marginBottom: 3,
    paddingLeft: 4,
  },
  theirBubble: {
    maxWidth: '75%',
    backgroundColor: DARK.card,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: DARK.textPrimary,
    lineHeight: 22,
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  bubbleTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: DARK.textMuted,
  },
  dateSep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: DARK.border },
  dateText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: DARK.textMuted,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 16,
    paddingHorizontal: 40,
  },
  emptyChatIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChatTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: DARK.textPrimary,
  },
  emptyChatText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: DARK.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: DARK.border,
    backgroundColor: DARK.bg,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: DARK.card,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
  },
  input: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: DARK.textPrimary,
    padding: 0,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
