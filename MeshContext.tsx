import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid } from 'react-native';
import { BleManager, Device, State } from 'react-native-ble-plx';
import { useDevice } from './DeviceContext';

const MSGS_KEY = '@meshchat_messages';
const PEERS_KEY = '@meshchat_peers';
const CHANNELS_KEY = '@meshchat_channels';
const MESH_APP_TAG = 'MC';

export interface Peer {
  id: string;
  name: string;
  rssi: number;
  lastSeen: number;
  discoveryType: 'ble' | 'wifi' | 'manual';
  meshId?: string;
  isMeshDevice: boolean;
  isConnected: boolean;
  serviceUUIDs?: string[];
  localName?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'file';
  timestamp: number;
  status: 'sending' | 'delivered' | 'failed';
  routeHops?: string[];
  isOwn: boolean;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: number;
  members: string[];
  isOwner: boolean;
}

interface MeshContextValue {
  peers: Peer[];
  knownPeers: Peer[];
  messages: Record<string, Message[]>;
  channels: Channel[];
  isScanning: boolean;
  bleState: State | null;
  scanError: string | null;
  startScan: () => void;
  stopScan: () => void;
  sendMessage: (peerId: string, content: string) => void;
  createChannel: (name: string, description: string) => void;
  deleteChannel: (channelId: string) => void;
  sendChannelMessage: (channelId: string, content: string) => void;
  addPeerManually: (meshId: string) => void;
  getConversationMessages: (id: string) => Message[];
  totalUnread: number;
  unreadFor: (id: string) => number;
  markRead: (id: string) => void;
}

const MeshContext = createContext<MeshContextValue | null>(null);

export function MeshProvider({ children }: { children: ReactNode }) {
  const { profile } = useDevice();
  const [peers, setPeers] = useState<Peer[]>([]);
  const [knownPeers, setKnownPeers] = useState<Peer[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [bleState, setBleState] = useState<State | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [readMap, setReadMap] = useState<Record<string, number>>({});

  const managerRef = useRef<BleManager | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peersRef = useRef<Map<string, Peer>>(new Map());

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const manager = new BleManager();
    managerRef.current = manager;

    const sub = manager.onStateChange((state) => {
      setBleState(state);
    }, true);

    loadPersistedData();

    return () => {
      sub.remove();
      manager.stopDeviceScan();
      manager.destroy();
    };
  }, []);

  async function loadPersistedData() {
    try {
      const [msgsRaw, peersRaw, chansRaw] = await Promise.all([
        AsyncStorage.getItem(MSGS_KEY),
        AsyncStorage.getItem(PEERS_KEY),
        AsyncStorage.getItem(CHANNELS_KEY),
      ]);
      if (msgsRaw) setMessages(JSON.parse(msgsRaw));
      if (peersRaw) {
        const saved: Peer[] = JSON.parse(peersRaw);
        setKnownPeers(saved);
        saved.forEach((p) => peersRef.current.set(p.id, p));
      }
      if (chansRaw) setChannels(JSON.parse(chansRaw));
    } catch {}
  }

  async function requestBlePermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      if (parseInt(Platform.Version as string, 10) >= 31) {
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return Object.values(results).every(
          (r) => r === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch {
      return false;
    }
  }

  const startScan = useCallback(async () => {
    if (Platform.OS === 'web') {
      setScanError('BLE недоступен в браузере');
      return;
    }
    const manager = managerRef.current;
    if (!manager) return;

    setScanError(null);
    const hasPerms = await requestBlePermissions();
    if (!hasPerms) {
      setScanError('Нет разрешений Bluetooth');
      return;
    }

    if (bleState !== State.PoweredOn) {
      setScanError(
        bleState === State.PoweredOff
          ? 'Включите Bluetooth'
          : 'Bluetooth недоступен'
      );
      return;
    }

    peersRef.current.clear();
    setPeers([]);
    setIsScanning(true);

    manager.startDeviceScan(null, { allowDuplicates: false }, (err, device) => {
      if (err) {
        setIsScanning(false);
        setScanError(err.message);
        return;
      }
      if (!device) return;

      const peer: Peer = {
        id: device.id,
        name: device.name || device.localName || `Устройство ${device.id.slice(-5)}`,
        rssi: device.rssi ?? -100,
        lastSeen: Date.now(),
        discoveryType: 'ble',
        isMeshDevice:
          device.localName?.startsWith(MESH_APP_TAG) ||
          (device.serviceUUIDs?.includes('aabb0001-1234-5678-9abc-def000000000') ??
            false),
        meshId: device.localName?.startsWith(MESH_APP_TAG)
          ? device.localName.slice(3)
          : undefined,
        isConnected: false,
        serviceUUIDs: device.serviceUUIDs ?? [],
        localName: device.localName ?? undefined,
      };

      peersRef.current.set(device.id, peer);
      setPeers(Array.from(peersRef.current.values()));
    });

    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    scanTimerRef.current = setTimeout(() => {
      stopScan();
    }, 15000);
  }, [bleState]);

  const stopScan = useCallback(() => {
    managerRef.current?.stopDeviceScan();
    setIsScanning(false);
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    const discovered = Array.from(peersRef.current.values());
    if (discovered.length > 0) {
      setKnownPeers((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        discovered.forEach((p) => map.set(p.id, p));
        const merged = Array.from(map.values());
        AsyncStorage.setItem(PEERS_KEY, JSON.stringify(merged)).catch(() => {});
        return merged;
      });
    }
  }, []);

  const sendMessage = useCallback(
    (peerId: string, content: string) => {
      if (!content.trim()) return;
      const msg: Message = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        conversationId: peerId,
        senderId: profile.deviceId,
        senderName: profile.nickname,
        content: content.trim(),
        type: 'text',
        timestamp: Date.now(),
        status: 'delivered',
        isOwn: true,
        routeHops: [profile.deviceId],
      };
      setMessages((prev) => {
        const conv = [...(prev[peerId] ?? []), msg];
        const updated = { ...prev, [peerId]: conv };
        AsyncStorage.setItem(MSGS_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    },
    [profile.deviceId, profile.nickname]
  );

  const createChannel = useCallback(
    async (name: string, description: string) => {
      const channel: Channel = {
        id: `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim(),
        description: description.trim(),
        createdBy: profile.deviceId,
        createdAt: Date.now(),
        members: [profile.deviceId],
        isOwner: true,
      };
      setChannels((prev) => {
        const updated = [...prev, channel];
        AsyncStorage.setItem(CHANNELS_KEY, JSON.stringify(updated)).catch(
          () => {}
        );
        return updated;
      });
    },
    [profile.deviceId]
  );

  const deleteChannel = useCallback((channelId: string) => {
    setChannels((prev) => {
      const updated = prev.filter((c) => c.id !== channelId);
      AsyncStorage.setItem(CHANNELS_KEY, JSON.stringify(updated)).catch(
        () => {}
      );
      return updated;
    });
  }, []);

  const sendChannelMessage = useCallback(
    (channelId: string, content: string) => {
      if (!content.trim()) return;
      const msg: Message = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        conversationId: channelId,
        senderId: profile.deviceId,
        senderName: profile.nickname,
        content: content.trim(),
        type: 'text',
        timestamp: Date.now(),
        status: 'delivered',
        isOwn: true,
      };
      setMessages((prev) => {
        const conv = [...(prev[channelId] ?? []), msg];
        const updated = { ...prev, [channelId]: conv };
        AsyncStorage.setItem(MSGS_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    },
    [profile.deviceId, profile.nickname]
  );

  const addPeerManually = useCallback(
    (meshId: string) => {
      const peer: Peer = {
        id: `manual-${meshId}`,
        name: `Устройство ${meshId.slice(0, 6)}`,
        rssi: -80,
        lastSeen: Date.now(),
        discoveryType: 'manual',
        meshId,
        isMeshDevice: true,
        isConnected: false,
      };
      peersRef.current.set(peer.id, peer);
      setKnownPeers((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        map.set(peer.id, peer);
        const merged = Array.from(map.values());
        AsyncStorage.setItem(PEERS_KEY, JSON.stringify(merged)).catch(() => {});
        return merged;
      });
    },
    []
  );

  const getConversationMessages = useCallback(
    (id: string) => messages[id] ?? [],
    [messages]
  );

  const markRead = useCallback((id: string) => {
    setReadMap((prev) => ({ ...prev, [id]: Date.now() }));
  }, []);

  const unreadFor = useCallback(
    (id: string) => {
      const conv = messages[id] ?? [];
      const lastRead = readMap[id] ?? 0;
      return conv.filter((m) => !m.isOwn && m.timestamp > lastRead).length;
    },
    [messages, readMap]
  );

  const totalUnread = useMemo(() => {
    const allIds = [
      ...knownPeers.map((p) => p.id),
      ...channels.map((c) => c.id),
    ];
    return allIds.reduce((sum, id) => sum + unreadFor(id), 0);
  }, [knownPeers, channels, unreadFor]);

  const value = useMemo<MeshContextValue>(
    () => ({
      peers,
      knownPeers,
      messages,
      channels,
      isScanning,
      bleState,
      scanError,
      startScan,
      stopScan,
      sendMessage,
      createChannel,
      deleteChannel,
      sendChannelMessage,
      addPeerManually,
      getConversationMessages,
      totalUnread,
      unreadFor,
      markRead,
    }),
    [
      peers,
      knownPeers,
      messages,
      channels,
      isScanning,
      bleState,
      scanError,
      startScan,
      stopScan,
      sendMessage,
      createChannel,
      deleteChannel,
      sendChannelMessage,
      addPeerManually,
      getConversationMessages,
      totalUnread,
      unreadFor,
      markRead,
    ]
  );

  return <MeshContext.Provider value={value}>{children}</MeshContext.Provider>;
}

export function useMesh() {
  const ctx = useContext(MeshContext);
  if (!ctx) throw new Error('useMesh must be used within MeshProvider');
  return ctx;
}
