# Signal Layer: Firestore-Based WebRTC Signaling

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIGNAL LAYER PURPOSE                         │
│     Facilitate P2P Connection Setup → Then Step Away            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Signal Flow Diagram

```
    HOST (Caller)                  FIRESTORE                   GUEST (Callee)
         │                     (Signal Broker)                      │
         │                            │                             │
         ├── 1. Create Room──────────→│                             │
         │   state: 'waiting'         │                             │
         │                            │                             │
         ├── 2. Write SDP Offer──────→│                             |
         │   + ICE Candidates         │                             │
         │   state: 'offered'         │                             │
         │                            │                             │
         │                            │<── 3. Read Offer────────────┤
         │                            │                             │
         │                            │<── 4. Write SDP Answer──────┤
         │                            │   + ICE Candidates          │
         │                            │   state: 'answered'         │
         │                            │                             │
         ├── 5. Read Answer──────────→│                             │
         │                            │                             │
         ├────────────── 6. Exchange ICE Candidates ────────────────┤
         │                 (via Firestore subcollections)           │
         │                            │                             │
         ╞════════════════════════════╪═════════════════════════════╡
         │                            │                             │
         │           ✓ Direct P2P Connection Established            │
         │              (DataChannel opens, no more Firestore)      │
         │                            │                             │
         └────────────────────────────┴─────────────────────────────┘
                     Firestore no longer used after connection
```

---

## Firestore Data Structure

```
rooms/
  └── {roomId}/
       ├── [DOCUMENT FIELDS]
       │    ├── offer: { type, sdp }           ← Host's SDP
       │    ├── answer: { type, sdp }          ← Guest's SDP
       │    ├── state: "waiting" | "offered" | "answered" | "connected"
       │    ├── createdAt: timestamp
       │    └── type: "p2p-chat"
       │
       ├── [SUBCOLLECTION] callerCandidates/   ← Host ICE candidates
       │    ├── {candidateId1}
       │    ├── {candidateId2}
       │    └── ...
       │
       └── [SUBCOLLECTION] calleeCandidates/   ← Guest ICE candidates
            ├── {candidateId1}
            ├── {candidateId2}
            └── ...
```

---

## Connection State Lifecycle

```
┌──────┐       ┌───────────┐       ┌────────────┐       ┌───────────┐
│ IDLE │──────>│ SIGNALING │──────>│ CONNECTING │──────>│ CONNECTED │
└──────┘       └───────────┘       └────────────┘       └───────────┘
  Start         Firestore           ICE Exchange         P2P Ready
                SDP Exchange        via Firestore        (No Firestore)

                     │                    │
                     │                    ↓
                     │            ┌──────────────┐
                     │            │ DISCONNECTED │
                     │            └──────────────┘
                     ↓                    ↑
               ┌────────┐                 │
               │ FAILED │─────────────────┘
               └────────┘
```

---

## Key Components

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐              │
│  │   FIREBASE       │         │   NESTJS SERVER  │              │
│  │   FIRESTORE      │         │   (Minimal)      │              │
│  ├──────────────────┤         ├──────────────────┤              │
│  │ • Real-time DB   │         │ • Quick-match    │              │
│  │ • SDP storage    │         │ • Pairing only   │              │
│  │ • ICE exchange   │         │ • In-memory      │              │
│  │ • Auto-scaling   │         │   queue          │              │
│  └──────────────────┘         └──────────────────┘              │
│         ↓                              ↓                        │
│         └──────────────┬──────────────┘                         │
│                        ↓                                        │
│              SIGNALING COMPLETE                                 │
│                        ↓                                        │
│         ┌──────────────────────────────┐                        │
│         │  WebRTC P2P DataChannel      │                        │
│         │  (No server, no Firestore)   │                        │
│         └──────────────────────────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Design Trade-offs

```
╔═══════════════════════════════════════════════════════════════╗
║                    WHY FIRESTORE?                             ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ✅  No custom WebSocket server infrastructure                ║
║  ✅  Real-time synchronization (onSnapshot)                   ║
║  ✅  Auto-scaling, managed service                            ║
║  ✅  Simple integration                                       ║
║                                                               ║
║  ⚠️  Vendor lock-in                                           ║
║  ⚠️  Read/write costs scale with usage                        ║
║  ⚠️  Requires internet (no offline signaling)                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Signaling vs. Messaging

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   SIGNALING LAYER                  P2P MESSAGING LAYER          │
│   (Firestore)                      (WebRTC DataChannel)         │
│                                                                 │
│   ┌─────────────────┐              ┌─────────────────┐          │
│   │ Connection      │              │ Chat messages   │          │
│   │ Setup Only      │══════════════│ flow directly   │          │
│   │                 │   Enables    │ peer-to-peer    │          │
│   │ • SDP exchange  │   ═══════>   │                 │          │
│   │ • ICE exchange  │              │ • No server     │          │
│   │ • Room state    │              │ • No Firestore  │          │
│   └─────────────────┘              └─────────────────┘          │
│                                                                 │
│   Used: 2-3 seconds                Used: Entire chat session    │
│   Then: Disconnects                Latency: ~10-50ms            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Highlights

### Real-time Listeners (Firestore `onSnapshot`)

```typescript
// Host: Listen for answer
onSnapshot(doc(db, 'rooms', roomId), async (snap) => {
  const data = snap.data();
  if (data?.answer && !pc.currentRemoteDescription) {
    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
  }
});

// Both: Listen for ICE candidates
onSnapshot(collection(db, `rooms/${roomId}/calleeCandidates`), (snap) => {
  for (const change of snap.docChanges()) {
    if (change.type === 'added') {
      pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
    }
  }
});
```

---

## Scalability Characteristics

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   CONCURRENT ROOMS: Handled by Firestore auto-scaling           │
│                                                                 │
│   ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                        │
│   │Room 1│  │Room 2│  │Room 3│  │Room N│  ← Firestore           │
│   └───┬──┘  └───┬──┘  └───┬──┘  └───┬──┘                        │
│       │         │         │         │                           │
│   ┌───▼─────────▼─────────▼─────────▼───┐                       │
│   │     Firebase Firestore Cloud        │                       │
│   │     (Automatically scales)           │                      │
│   └──────────────────────────────────────┘                      │
│                                                                 │
│   SERVER LOAD: Minimal (pairing requests only)                  │
│   MESSAGE LOAD: Zero (all P2P after signaling)                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Metrics

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   Signaling Duration:        ~2-3 seconds                     ║
║   Firestore Reads/Room:      ~5-10 operations                 ║
║   Firestore Writes/Room:     ~5-15 operations                 ║
║   Latency (signaling):       ~200-500ms per RTT               ║
║   Latency (post-connect):    0ms (direct P2P)                 ║
║   Connection Success:        ~85-95% (STUN only)              ║
║                              ~99% (with TURN servers)         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  SIGNAL LAYER ROLE: Connection Facilitator, Not Message Relay   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           |  │
│  │  1. Firestore stores SDP offers/answers + ICE candidates  │  │
│  │  2. Real-time updates via onSnapshot listeners            │  │
│  │  3. Server provides quick-match pairing only              │  │
│  │  4. After P2P connection: Firestore not used              │  │
│  │  5. Decentralized architecture enables scalability        │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  RESULT: True peer-to-peer communication with minimal           │
│          infrastructure overhead                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Questions?

```
                       Signal Layer Team
                    Jingheng Huan (jh730)

        ┌────────────────────────────────────────┐
        │  For more details, see:                │
        │  • docs/ARCHITECTURE.md                │
        │  • docs/DESIGN_DECISIONS.md            │
        │  • apps/client/src/ui/App.tsx          │
        └────────────────────────────────────────┘
```

