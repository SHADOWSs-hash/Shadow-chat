import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useDevice } from '@/context/DeviceContext';
import { useMesh, Channel } from '@/context/MeshContext';
import { DARK } from '@/constants/colors';

function ChannelCard({ channel, index }: { channel: Channel; index: number }) {
  const { accent } = useDevice();
  const { messages, deleteChannel, unreadFor, markRead } = useMesh();
  const convMsgs = messages[channel.id] ?? [];
  const lastMsg = convMsgs[convMsgs.length - 1];
  const unread = unreadFor(channel.id);

  const handlePress = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markRead(channel.id);
    router.push({
      pathname: '/chat/[id]',
      params: { id: channel.id, name: channel.name, isChannel: '1' },
    });
  };

  const handleDelete = () => {
    Alert.alert('Удалить канал', `Удалить "${channel.name}"?`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => deleteChannel(channel.id),
      },
    ]);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        onLongPress={channel.isOwner ? handleDelete : undefined}
        style={styles.channelCard}
      >
        <View style={[styles.channelIcon, { backgroundColor: accent.bubble }]}>
          <Ionicons name="radio" size={22} color={accent.primary} />
        </View>

        <View style={styles.channelInfo}>
          <View style={styles.channelTop}>
            <Text style={styles.channelName}># {channel.name}</Text>
            {lastMsg && (
              <Text style={styles.channelTime}>
                {new Date(lastMsg.timestamp).toLocaleTimeString('ru', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}
          </View>
          <View style={styles.channelBottom}>
            <Text style={styles.channelDesc} numberOfLines={1}>
              {lastMsg
                ? lastMsg.isOwn
                  ? `Вы: ${lastMsg.content}`
                  : lastMsg.content
                : channel.description || 'Нет сообщений'}
            </Text>
            <View style={styles.channelMeta}>
              <View style={styles.memberCount}>
                <Ionicons name="people" size={12} color={DARK.textMuted} />
                <Text style={styles.memberCountText}>{channel.members.length}</Text>
              </View>
              {unread > 0 && (
                <View style={[styles.badge, { backgroundColor: accent.primary }]}>
                  <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function CreateChannelModal({
  visible,
  onClose,
  onCreate,
  accent,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, desc: string) => void;
  accent: { primary: string; bubble: string };
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const insets = useSafeAreaInsets();

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), desc.trim());
    setName('');
    setDesc('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}
        >
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Новый канал</Text>
          <Text style={styles.modalSubtitle}>
            Создайте группу для общения в mesh-сети
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>НАЗВАНИЕ</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Мой канал"
              placeholderTextColor={DARK.textMuted}
              style={[styles.input, { borderColor: name ? accent.primary : DARK.border }]}
              maxLength={32}
              autoFocus
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ОПИСАНИЕ (необязательно)</Text>
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder="Описание канала"
              placeholderTextColor={DARK.textMuted}
              style={styles.input}
              maxLength={100}
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.createBtn,
                { backgroundColor: name.trim() ? accent.primary : DARK.border },
              ]}
              onPress={handleCreate}
              disabled={!name.trim()}
            >
              <Text style={styles.createText}>Создать</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function ChannelsScreen() {
  const { accent } = useDevice();
  const { channels, createChannel } = useMesh();
  const insets = useSafeAreaInsets();
  const [showCreate, setShowCreate] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom + 80;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Каналы</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: accent.bubble }]}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowCreate(true);
          }}
        >
          <Ionicons name="add" size={22} color={accent.primary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>ВАШИ КАНАЛЫ</Text>

      {channels.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="radio-outline" size={56} color={DARK.textMuted} />
          <Text style={styles.emptyTitle}>Нет каналов</Text>
          <Text style={styles.emptyText}>
            Создайте канал для группового общения в mesh-сети без интернета
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { borderColor: accent.primary }]}
            onPress={() => setShowCreate(true)}
          >
            <Ionicons name="add" size={18} color={accent.primary} />
            <Text style={[styles.emptyBtnText, { color: accent.primary }]}>
              Создать канал
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={channels}
          keyExtractor={(c) => c.id}
          renderItem={({ item, index }) => (
            <ChannelCard channel={item} index={index} />
          )}
          contentContainerStyle={{ paddingBottom: bottomPad, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      <CreateChannelModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={createChannel}
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
    paddingBottom: 8,
    paddingTop: 8,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: DARK.textPrimary,
    letterSpacing: -0.5,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: DARK.textMuted,
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK.card,
    borderRadius: 16,
    padding: 14,
    gap: 14,
  },
  channelIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelInfo: { flex: 1, gap: 5 },
  channelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  channelName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: DARK.textPrimary,
  },
  channelTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: DARK.textMuted,
  },
  channelBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  channelDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: DARK.textSecondary,
    flex: 1,
  },
  channelMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberCount: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  memberCountText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: DARK.textMuted,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#fff' },
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
  emptyBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
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
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
  },
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
