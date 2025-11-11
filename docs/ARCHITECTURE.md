# System Architecture

## Overview

This P2P chat application implements a distributed communication system where messages flow directly between browsers without a central relay server. The system uses a three-layer architecture to facilitate peer-to-peer connections.

## Three-Layer Architecture

### 1. Signaling Layer (Firebase Firestore)

**Purpose**: Facilitate initial connection setup and exchange of WebRTC signaling information before peers can establish direct connections.

**Implementation**:

- Uses Firebase Firestore as a real-time database for signaling
- Room-based signaling model where each chat room is a Firestore document
- Structure:
  - `rooms/{roomId}` - Main room document containing:
    - `offer`: SDP offer from the host (caller)
    - `answer`: SDP answer from the guest (callee)
    - `state`: Room lifecycle state (`waiting` → `offered` → `answered` → `connected`)
    - `createdAt`: Timestamp
    - `type`: Room type identifier (`p2p-chat`)
  - `rooms/{roomId}/callerCandidates` - Subcollection for ICE candidates from host
  - `rooms/{roomId}/calleeCandidates` - Subcollection for ICE candidates from guest

**Key Operations**:

- Host creates room and writes offer to Firestore
- Guest reads offer and writes answer to Firestore
- Both peers exchange ICE candidates through Firestore subcollections
- Real-time updates via Firestore `onSnapshot` listeners

**Why Firestore**: Provides real-time synchronization without requiring a custom WebSocket server, simplifying deployment and reducing infrastructure overhead.

### 2. Peer-to-Peer Layer (WebRTC DataChannel)

**Purpose**: Enable direct, low-latency bidirectional data transfer between peers after signaling completes.

**Implementation**:

- Uses WebRTC's RTCPeerConnection API
- Single ordered DataChannel named `chat` for message transmission
- STUN servers for NAT traversal:
  - `stun:stun.l.google.com:19302` (Google)
  - `stun:global.stun.twilio.com:3478` (Twilio)
- Connection states tracked via `RTCPeerConnection.connectionState`:
  - `idle` → `signaling` → `connecting` → `connected` / `disconnected` / `failed`

**DataChannel Configuration**:

- Name: `chat`
- Ordered: `true` (ensures message ordering)
- Protocol: JSON messages with structure `{ t: 'chat', text: string }`

**Connection Flow**:

1. Host creates RTCPeerConnection and DataChannel
2. Host generates offer and sets local description
3. Guest receives offer, creates RTCPeerConnection
4. Guest sets remote description, generates answer, sets local description
5. Both peers exchange ICE candidates
6. Once connection established, DataChannel opens
7. Messages flow directly between peers (no server relay)

### 3. Client Application Layer (React + TypeScript)

**Purpose**: Provide user interface for creating/joining rooms, sending messages, and observing connection status.

**Components**:

- **App Component** (`apps/client/src/ui/App.tsx`):
  - Room management (create/join)
  - Quick-match pairing
  - Message display and input
  - Connection state monitoring
  - WebRTC and Firestore integration

**State Management**:

- React hooks (`useState`, `useRef`, `useMemo`)
- Local state for:
  - Room ID
  - Role (host/guest)
  - Connection state
  - Message log
  - Input text

**Key Functions**:

- `createRoom()`: Host creates room, sets up WebRTC connection, writes offer to Firestore
- `joinRoom()`: Guest joins existing room, reads offer, creates answer, writes to Firestore
- `quickMatch()`: Automatically pairs users via server endpoint
- `wireChat()`: Sets up DataChannel event handlers (onopen, onclose, onmessage)
- `sendChat()`: Sends JSON message through DataChannel

## Server Role (NestJS)

**Purpose**: Minimal server role - only facilitates quick-match pairing, not message relay.

**Implementation**:

- Single endpoint: `/quick-match` (POST)
- In-memory queue for pairing users
- Returns:
  - `{ status: 'waiting', roomId: string }` - First user joins queue
  - `{ status: 'paired', roomId: string }` - Second user gets paired with first

**Additional Endpoints**:

- `GET /health` - Health check
- `GET /version` - Version information
- `GET /quick-match/peek` - Check queue length
- `DELETE /quick-match/reset` - Clear queue (for testing)

**Why Minimal Server**: Messages flow directly P2P, so server is only needed for initial pairing. This reduces server load and improves scalability.

## Data Flow

### Room Creation Flow (Host)

1. User clicks "Create Room"
2. App creates Firestore room document (`state: 'waiting'`)
3. App creates RTCPeerConnection and DataChannel
4. App generates SDP offer, sets local description
5. App writes offer to Firestore (`state: 'offered'`)
6. App listens for answer and callee ICE candidates
7. When answer received, sets remote description
8. ICE candidates exchanged via Firestore subcollections
9. Connection established, DataChannel opens (`state: 'connected'`)

### Room Joining Flow (Guest)

1. User enters room ID and clicks "Join"
2. App reads room document from Firestore
3. App creates RTCPeerConnection
4. App sets remote description (from offer)
5. App generates SDP answer, sets local description
6. App writes answer to Firestore (`state: 'answered'`)
7. App listens for caller ICE candidates
8. App sends ICE candidates to Firestore subcollection
9. ICE candidates exchanged
10. Connection established, DataChannel received (`state: 'connected'`)

### Quick-Match Flow

1. User clicks "Quick-Match"
2. Client calls `POST /quick-match`
3. If queue empty: Server creates roomId, adds to queue, returns `waiting`
4. If queue not empty: Server pairs with first user, returns `paired`
5. Client automatically calls `createRoom()` or `joinRoom()` based on status

### Message Flow (After Connection)

1. User types message and clicks "Send"
2. App serializes message as JSON: `{ t: 'chat', text: string }`
3. App sends through DataChannel: `dc.send(JSON.stringify(msg))`
4. Message travels directly P2P (no server involved)
5. Peer receives via `dc.onmessage` handler
6. Peer parses JSON and displays message

## Room Lifecycle States

1. **waiting**: Room created, waiting for guest
2. **offered**: Host has created and written offer
3. **answered**: Guest has created and written answer
4. **connected**: WebRTC connection established, DataChannel open
5. **disconnected**: Connection lost or closed
6. **failed**: Connection failed

## Connection State Machine

```
idle → signaling → connecting → connected
                          ↓
                    disconnected/failed
```

- **idle**: No active connection
- **signaling**: Exchanging SDP offers/answers via Firestore
- **connecting**: ICE candidates being exchanged, establishing connection
- **connected**: P2P connection established, DataChannel open
- **disconnected**: Connection closed gracefully
- **failed**: Connection failed (NAT traversal failed, network issues, etc.)

## Security Considerations

- **CORS**: Server configured with `origin: true` (permissive for development)
- **Input Validation**: Limited validation on server endpoints
- **Firebase Security**: Relies on Firestore security rules (not implemented in codebase)
- **WebRTC Security**: Uses DTLS for encrypted DataChannel communication

## Scalability Characteristics

- **Signaling**: Firestore scales horizontally, but each room requires document writes
- **P2P Messages**: No server bottleneck - messages flow directly between peers
- **Server Load**: Minimal - only handles quick-match pairing requests
- **Limitations**:
  - Firestore read/write limits per room
  - NAT traversal may fail without TURN servers
  - In-memory queue on server (lost on restart)

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: NestJS (Node.js), TypeScript
- **Signaling**: Firebase Firestore
- **P2P**: WebRTC DataChannel API
- **STUN**: Google STUN, Twilio STUN
- **Deployment**: Firebase Hosting (client), Render/Fly.io/Cloud Run (server)
