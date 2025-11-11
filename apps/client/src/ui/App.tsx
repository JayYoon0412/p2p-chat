import React, { useMemo, useRef, useState } from 'react';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDb } from '../firebase.js';
import { createPeer, sendJSON } from '../webrtc.js';

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function App() {
  const db = useMemo(() => getDb(), []);
  const [roomId, setRoomId] = useState('');
  const [role, setRole] = useState<'host' | 'guest' | null>(null);
  const [connState, setConnState] = useState<string>('idle');
  const [status, setStatus] = useState<string>('Not connected');

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const chatRef = useRef<RTCDataChannel | null>(null);
  const unsub: Array<() => void> = [];

  const [log, setLog] = useState<
    Array<{ id: string; who: string; text: string; ts: string }>
  >([]);
  const [input, setInput] = useState('');

  const append = (who: string, text: string) =>
    setLog((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        who,
        text,
        ts: new Date().toLocaleTimeString(),
      },
    ]);

  function cleanup() {
    while (unsub.length)
      try {
        unsub.pop()!();
      } catch {}
    try {
      chatRef.current?.close();
    } catch {}
    try {
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;
    chatRef.current = null;
    setConnState('idle');
    setStatus('Not connected');
    setRole(null);
  }

  async function createRoom(existingRoomId?: string) {
    cleanup();
    setRole('host');
    setConnState('signaling');
    const pc = createPeer();
    pcRef.current = pc;
    
    let roomIdToUse: string;
    if (existingRoomId) {
      // Use provided room ID (from quick-match)
      roomIdToUse = existingRoomId;
      await setDoc(doc(db, 'rooms', roomIdToUse), {
        createdAt: serverTimestamp(),
        type: 'p2p-chat',
        state: 'waiting',
      });
      append('system', `Using room: ${roomIdToUse}`);
    } else {
      // Create new room
      const roomRef = await addDoc(collection(db, 'rooms'), {
        createdAt: serverTimestamp(),
        type: 'p2p-chat',
        state: 'waiting',
      });
      roomIdToUse = roomRef.id;
      append('system', `Room created: ${roomIdToUse}`);
    }
    setRoomId(roomIdToUse);

    const chat = pc.createDataChannel('chat', { ordered: true });
    chatRef.current = chat;
    wireChat(chat);

    const callerCands = collection(db, `rooms/${roomIdToUse}/callerCandidates`);
    pc.onicecandidate = async (e) => {
      if (e.candidate) {
        const init = {
          candidate: e.candidate.candidate,
          sdpMid: e.candidate.sdpMid,
          sdpMLineIndex: e.candidate.sdpMLineIndex,
          usernameFragment: (e.candidate as any).usernameFragment ?? null,
        };
        await addDoc(callerCands, init);
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await setDoc(
      doc(db, 'rooms', roomIdToUse),
      { offer: { type: offer.type, sdp: offer.sdp }, state: 'offered' },
      { merge: true },
    );

    const unsubRoom = onSnapshot(doc(db, 'rooms', roomIdToUse), async (snap) => {
      const data = snap.data();
      if (data?.answer && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        setConnState('connecting');
      }
    });
    const calleeCands = collection(db, `rooms/${roomIdToUse}/calleeCandidates`);
    const unsubCand = onSnapshot(calleeCands, async (snap) => {
      for (const ch of snap.docChanges())
        if (ch.type === 'added') {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(ch.doc.data()));
          } catch {}
        }
    });

    pc.onconnectionstatechange = () => setConnState(pc.connectionState);
    unsub.push(unsubRoom, unsubCand);
    setStatus(`Room ID: ${roomIdToUse} — share with peer or use quick‑match.`);
  }

  async function joinRoom(roomIdParam?: string) {
    const idToUse = roomIdParam || roomId;
    if (!idToUse) return;
    cleanup();
    setRole('guest');
    setConnState('signaling');
    
    // Wait for room to exist and have an offer
    let roomDoc = await getDoc(doc(db, 'rooms', idToUse));
    if (!roomDoc.exists()) {
      // Wait for room to be created (for quick-match scenario)
      const unsubWait = onSnapshot(doc(db, 'rooms', idToUse), async (snap) => {
        if (snap.exists() && snap.data()?.offer) {
          unsubWait();
          unsub.splice(unsub.indexOf(unsubWait), 1);
          await joinRoomWithOffer(snap, idToUse);
        }
      });
      unsub.push(unsubWait);
      return;
    }
    
    if (!roomDoc.data()?.offer) {
      // Wait for offer to be created
      const unsubWait = onSnapshot(doc(db, 'rooms', idToUse), async (snap) => {
        if (snap.exists() && snap.data()?.offer) {
          unsubWait();
          unsub.splice(unsub.indexOf(unsubWait), 1);
          await joinRoomWithOffer(snap, idToUse);
        }
      });
      unsub.push(unsubWait);
      return;
    }
    
    await joinRoomWithOffer(roomDoc, idToUse);
  }
  
  async function joinRoomWithOffer(roomDoc: any, roomIdParam: string) {
    const roomData = roomDoc.data();
    if (!roomData?.offer) {
      append('system', 'Waiting for offer...');
      return;
    }

    const pc = createPeer();
    pcRef.current = pc;
    pc.ondatachannel = (e) => {
      if (e.channel.label === 'chat') {
        chatRef.current = e.channel;
        wireChat(e.channel);
      }
    };

    const calleeCands = collection(db, `rooms/${roomIdParam}/calleeCandidates`);
    pc.onicecandidate = async (e) => {
      if (e.candidate) {
        const init = {
          candidate: e.candidate.candidate,
          sdpMid: e.candidate.sdpMid,
          sdpMLineIndex: e.candidate.sdpMLineIndex,
          usernameFragment: (e.candidate as any).usernameFragment ?? null,
        };
        await addDoc(calleeCands, init);
      }
    };

    await pc.setRemoteDescription(
      new RTCSessionDescription(roomData.offer),
    );
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await updateDoc(doc(db, 'rooms', roomIdParam), {
      answer: { type: answer.type, sdp: answer.sdp },
      state: 'answered',
    });

    const callerCands = collection(db, `rooms/${roomIdParam}/callerCandidates`);
    const unsubCaller = onSnapshot(callerCands, async (snap) => {
      for (const ch of snap.docChanges())
        if (ch.type === 'added') {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(ch.doc.data()));
          } catch {}
        }
    });

    pc.onconnectionstatechange = () => setConnState(pc.connectionState);
    unsub.push(unsubCaller);
    setStatus('Answered. Connecting…');
  }
  function wireChat(dc: RTCDataChannel) {
    dc.onopen = () => {
      setConnState('connected');
      append('system', 'Channel open');
    };
    dc.onclose = () => {
      setConnState('disconnected');
      append('system', 'Channel closed');
    };
    dc.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.t === 'chat') append('Peer', msg.text);
      } catch {
        append('Peer', ev.data);
      }
    };
  }
  async function quickMatch() {
    const res = await fetch(`${apiBase}/quick-match`, { method: 'POST' });
    const data = (await res.json()) as {
      status: 'waiting' | 'paired';
      roomId: string;
    };
    setRoomId(data.roomId);
    append('system', `Quick-match: ${data.status} — room ${data.roomId}`);
    if (data.status === 'waiting') {
      // act as host automatically, use the server-provided roomId
      await createRoom(data.roomId);
    } else {
      // act as guest automatically, pass roomId directly to avoid state timing issues
      await joinRoom(data.roomId);
    }
  }
  function sendChat() {
    const text = input.trim();
    if (!text || !chatRef.current || chatRef.current.readyState !== 'open')
      return;
    append('You', text);
    setInput('');
    sendJSON(chatRef.current, { t: 'chat', text });
  }
  return (
    <div style={{ fontFamily: 'Inter, system-ui, Arial', padding: 16 }}>
      <h1>P2P Distributed Chat</h1>
      <p style={{ color: '#555' }}>
        Decentralized comms: Firestore for signaling → WebRTC DataChannel for
        P2P messages.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <button onClick={createRoom}>Create Room</button>
        <input
          placeholder="Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          style={{ flex: 1 }}
        />
        <button onClick={joinRoom} disabled={!roomId}>
          Join
        </button>
        <button onClick={quickMatch}>Quick‑Match</button>
      </div>

      <div style={{ marginBottom: 8, fontSize: 12, color: '#666' }}>
        Role: {role ?? '—'} | Conn: {connState} | {status}
      </div>

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 12,
          height: '60vh',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1, overflow: 'auto', paddingRight: 8 }}>
          {log.map((m) => (
            <div key={m.id} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: '#999' }}>
                {m.ts} · {m.who}
              </div>
              <div style={{ fontSize: 14 }}>{m.text}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendChat()}
            placeholder={
              connState === 'connected'
                ? 'Type a message…'
                : 'Connect to start chatting…'
            }
            style={{ flex: 1 }}
          />
          <button
            onClick={sendChat}
            disabled={connState !== 'connected' || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>

      <details style={{ marginTop: 12 }}>
        <summary>Architecture notes</summary>
        <ul>
          <li>
            Signaling: Firestore doc <code>rooms/{'{id}'}</code> with
            subcollections <code>callerCandidates</code> /{' '}
            <code>calleeCandidates</code>.
          </li>
          <li>
            P2P: single ordered DataChannel named <code>chat</code>.
          </li>
          <li>
            Server: NestJS exposes <code>/quick-match</code> to pair strangers
            by handing out a shared <code>roomId</code>.
          </li>
          <li>
            Hosting: Deploy client to Firebase Hosting; server to
            Render/Fly/Cloud Run (or also Firebase if using Functions).
          </li>
        </ul>
      </details>
    </div>
  );
}
