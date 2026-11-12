/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SimSessionState } from '../types/medical';

export type SyncMessage =
  | { type: 'STATE_UPDATE'; state: Partial<SimSessionState>; _originPeer?: string }
  | { type: 'TRIGGER_SHOCK'; joules: number; _originPeer?: string }
  | { type: 'TRIGGER_DRUG'; drugName: string; dose: string; _originPeer?: string }
  | { type: 'RESET_SCENARIO'; scenarioId: string; _originPeer?: string }
  | { type: 'MASTER_RESET'; _originPeer?: string }
  | { type: 'TRIGGER_ROSC'; _originPeer?: string }
  | { type: 'REQUEST_INITIAL_STATE'; peerId: string; _originPeer?: string }
  | { type: 'FULL_STATE_SNAPSHOT'; state: SimSessionState; _originPeer?: string }
  | { type: 'PROJECT_12_LEAD'; open: boolean; _originPeer?: string }
  | { type: 'PROJECT_SAMPLE'; open: boolean; _originPeer?: string }
  | { type: 'STUDENT_ACTION'; action: string; details: string; timestamp: string; _originPeer?: string };

export interface ActivePeer {
  id: string;
  role: string;
  name?: string;
  lastSeen: number;
}

type ListenerCallback = (msg: SyncMessage) => void;
type PeerCallback = (peers: ActivePeer[]) => void;

class SimSyncManager {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<ListenerCallback> = new Set();
  private peerListeners: Set<PeerCallback> = new Set();
  private channelName = 'trakas_3000_channel';
  private roomId: string = 'TRAKAS-3000';
  private peerId: string = '';
  private userRole: string = 'portal';
  private userName: string = 'Operador';
  private lastMsgTimestamp: number = 0;
  private processedMsgIds: Set<string> = new Set();
  private pollInterval: number | null = null;
  private heartbeatInterval: number | null = null;
  private currentPeers: ActivePeer[] = [];

  constructor() {
    this.peerId = `peer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.initLocalChannel();
  }

  private initLocalChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (event) => {
          const data = event.data;
          if (data && data._originPeer !== this.peerId) {
            this.notifyListeners(data);
          }
        };
      } catch {
        // Fallback to storage events
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === 'trakas_sync_event' && event.newValue) {
          try {
            const data = JSON.parse(event.newValue);
            if (data && data._originPeer !== this.peerId) {
              this.notifyListeners(data);
            }
          } catch {}
        }
      });
    }
  }

  /**
   * Initializes network room synchronization with the Express backend
   */
  public initRoom(roomId: string, role: string, name?: string) {
    this.roomId = roomId || 'TRAKAS-3000';
    this.userRole = role || 'student';
    if (name) this.userName = name;

    // Clear previous timers if any
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

    // Initial heartbeat
    this.sendHeartbeat();

    // Start heartbeat every 4 seconds
    this.heartbeatInterval = window.setInterval(() => {
      this.sendHeartbeat();
    }, 4000);

    // Start network polling every 700ms for cross-device synchronization
    this.pollInterval = window.setInterval(() => {
      this.pollNetworkRoom();
    }, 700);

    // If student, request initial snapshot immediately
    if (role === 'student') {
      setTimeout(() => {
        this.broadcast({ type: 'REQUEST_INITIAL_STATE', peerId: this.peerId });
      }, 500);
    }
  }

  private async sendHeartbeat() {
    if (typeof window === 'undefined') return;
    try {
      await fetch(`/api/sync/${encodeURIComponent(this.roomId)}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peerId: this.peerId,
          role: this.userRole,
          name: this.userName,
        }),
      });
    } catch {
      // Offline mode or server unavailable
    }
  }

  private async pollNetworkRoom() {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch(
        `/api/sync/${encodeURIComponent(this.roomId)}?since=${this.lastMsgTimestamp}`
      );
      if (!res.ok) return;
      const data = await res.json();

      if (data.now) {
        this.lastMsgTimestamp = Math.max(this.lastMsgTimestamp, data.now - 100);
      }

      // Update active peers
      if (Array.isArray(data.peers)) {
        this.currentPeers = data.peers;
        this.peerListeners.forEach((cb) => {
          try {
            cb(this.currentPeers);
          } catch {}
        });
      }

      // Process new incoming network messages
      if (Array.isArray(data.messages)) {
        for (const msg of data.messages) {
          if (msg.id && this.processedMsgIds.has(msg.id)) continue;
          if (msg.id) this.processedMsgIds.add(msg.id);

          // Ignore messages sent by ourselves
          if (msg._originPeer === this.peerId) continue;

          this.notifyListeners(msg as SyncMessage);
        }
      }
    } catch {
      // Network polling fallback to local
    }
  }

  public subscribe(callback: ListenerCallback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public onPeersChange(callback: PeerCallback) {
    this.peerListeners.add(callback);
    callback(this.currentPeers);
    return () => {
      this.peerListeners.delete(callback);
    };
  }

  public getConnectedPeers(): ActivePeer[] {
    return this.currentPeers;
  }

  public getPeerId(): string {
    return this.peerId;
  }

  private notifyListeners(msg: SyncMessage) {
    this.listeners.forEach((cb) => {
      try {
        cb(msg);
      } catch (err) {
        console.error('Error in sync listener:', err);
      }
    });
  }

  /**
   * Broadcast an event to local tabs AND physical remote devices
   */
  public broadcast(msg: SyncMessage) {
    const msgWithOrigin = {
      ...msg,
      _originPeer: this.peerId,
      _t: Date.now(),
    };

    // 1. BroadcastChannel (0ms local window)
    if (this.channel) {
      try {
        this.channel.postMessage(msgWithOrigin);
      } catch {}
    }

    // 2. localStorage fallback for same-device cross-window
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'trakas_sync_event',
          JSON.stringify({ ...msgWithOrigin, _rnd: Math.random() })
        );
      } catch {}
    }

    // 3. Network broadcast to Express server for physical remote devices
    if (typeof window !== 'undefined') {
      fetch(`/api/sync/${encodeURIComponent(this.roomId)}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgWithOrigin),
      }).catch(() => {});

      // If it's a state update, also persist it in the room's master state
      if (msg.type === 'STATE_UPDATE' && msg.state) {
        fetch(`/api/sync/${encodeURIComponent(this.roomId)}/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msg.state),
        }).catch(() => {});
      } else if (msg.type === 'FULL_STATE_SNAPSHOT' && msg.state) {
        fetch(`/api/sync/${encodeURIComponent(this.roomId)}/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msg.state),
        }).catch(() => {});
      }
    }
  }

  public saveStateLocally(state: SimSessionState) {
    try {
      localStorage.setItem('trakas_saved_session', JSON.stringify(state));
    } catch {}
  }

  public loadSavedState(): SimSessionState | null {
    try {
      const saved = localStorage.getItem('trakas_saved_session');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return null;
  }

  public clearSavedState() {
    try {
      localStorage.removeItem('trakas_saved_session');
      localStorage.removeItem('trakas_sync_event');
    } catch {}
  }
}

export const simSync = new SimSyncManager();
