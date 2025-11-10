# Architecture Diagrams

## System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        C1[React Client 1]
        C2[React Client 2]
    end

    subgraph "Signaling Layer"
        FS[Firebase Firestore]
        subgraph "Room Document"
            RD[rooms/roomId]
            CC[callerCandidates]
            CAL[calleeCandidates]
        end
    end

    subgraph "P2P Layer"
        DC1[WebRTC DataChannel 1]
        DC2[WebRTC DataChannel 2]
        STUN[STUN Servers<br/>Google & Twilio]
    end

    subgraph "Server Layer"
        SERVER[NestJS Server<br/>Quick-Match Only]
    end

    C1 -->|1. Create Room| FS
    C1 -->|2. Write Offer| RD
    C2 -->|3. Read Offer| RD
    C2 -->|4. Write Answer| RD
    C1 -->|5. Exchange ICE| CC
    C2 -->|5. Exchange ICE| CAL
    C1 -->|6. P2P Connection| DC1
    C2 -->|6. P2P Connection| DC2
    DC1 <-->|Direct Messages| DC2
    DC1 -->|NAT Traversal| STUN
    DC2 -->|NAT Traversal| STUN
    C1 -->|Quick-Match Request| SERVER
    C2 -->|Quick-Match Request| SERVER
    SERVER -->|Pair Users| C1
    SERVER -->|Pair Users| C2

    style C1 fill:#e1f5ff
    style C2 fill:#e1f5ff
    style FS fill:#fff4e1
    style DC1 fill:#e8f5e9
    style DC2 fill:#e8f5e9
    style SERVER fill:#fce4ec
```

## Room Creation Flow Sequence Diagram

```mermaid
sequenceDiagram
    participant Host as Host Client
    participant Firestore as Firebase Firestore
    participant Guest as Guest Client
    participant WebRTC as WebRTC P2P

    Note over Host,Guest: Room Creation & Joining Flow

    Host->>Firestore: Create room document (state: waiting)
    Host->>Host: Create RTCPeerConnection
    Host->>Host: Create DataChannel ('chat')
    Host->>Host: Generate SDP Offer
    Host->>Host: Set Local Description
    Host->>Firestore: Write offer (state: offered)

    Guest->>Firestore: Read room document
    Guest->>Guest: Create RTCPeerConnection
    Guest->>Guest: Set Remote Description (from offer)
    Guest->>Guest: Generate SDP Answer
    Guest->>Guest: Set Local Description
    Guest->>Firestore: Write answer (state: answered)

    Host->>Firestore: Listen for answer
    Host->>Host: Set Remote Description (from answer)

    Host->>Firestore: Send ICE candidates (callerCandidates)
    Guest->>Firestore: Send ICE candidates (calleeCandidates)

    Host->>Firestore: Listen for callee candidates
    Guest->>Firestore: Listen for caller candidates

    Host->>WebRTC: Add ICE candidates
    Guest->>WebRTC: Add ICE candidates

    WebRTC->>Host: Connection established
    WebRTC->>Guest: Connection established
    WebRTC->>Host: DataChannel open
    WebRTC->>Guest: DataChannel open

    Note over Host,Guest: Messages flow directly P2P
    Host->>Guest: Send message via DataChannel
    Guest->>Host: Send message via DataChannel
```

## Quick-Match Flow Sequence Diagram

```mermaid
sequenceDiagram
    participant User1 as User 1
    participant Server as NestJS Server
    participant Queue as In-Memory Queue
    participant User2 as User 2
    participant Firestore as Firebase Firestore

    Note over User1,User2: Quick-Match Pairing Flow

    User1->>Server: POST /quick-match
    Server->>Queue: Check queue length
    Queue-->>Server: Queue empty
    Server->>Server: Generate roomID
    Server->>Queue: Add User1 (roomID, timestamp)
    Server-->>User1: { status: 'waiting', roomID }
    User1->>User1: Auto-create room (host role)
    User1->>Firestore: Create room & write offer

    User2->>Server: POST /quick-match
    Server->>Queue: Check queue length
    Queue-->>Server: Queue has User1
    Server->>Queue: Remove User1 from queue
    Server-->>User2: { status: 'paired', roomId }
    User2->>User2: Auto-join room (guest role)
    User2->>Firestore: Read room & write answer

    Note over User1,User2: Standard WebRTC connection flow continues
    User1->>Firestore: Exchange ICE candidates
    User2->>Firestore: Exchange ICE candidates
    User1->>User2: P2P connection established
    User2->>User1: P2P connection established
```

## Data Flow Diagram

```mermaid
flowchart LR
    subgraph "Signaling Phase"
        A[Host Creates Room] --> B[Write Offer to Firestore]
        B --> C[Guest Reads Offer]
        C --> D[Write Answer to Firestore]
        D --> E[Exchange ICE Candidates]
    end

    subgraph "Connection Phase"
        E --> F[WebRTC Connection Established]
        F --> G[DataChannel Opens]
    end

    subgraph "Messaging Phase"
        G --> H[Host Sends Message]
        H --> I[Message via DataChannel]
        I --> J[Guest Receives Message]
        J --> K[Guest Sends Message]
        K --> L[Message via DataChannel]
        L --> H
    end

    style A fill:#e1f5ff
    style C fill:#e1f5ff
    style F fill:#e8f5e9
    style I fill:#e8f5e9
    style L fill:#e8f5e9
```

## Connection State Machine

```mermaid
stateDiagram-v2
    [*] --> idle: Initial State

    idle --> signaling: Create/Join Room
    signaling --> connecting: Answer Received
    connecting --> connected: ICE Complete
    connecting --> failed: Connection Failed
    connected --> disconnected: Channel Closed
    disconnected --> idle: Cleanup
    failed --> idle: Cleanup

    note right of signaling
        Exchanging SDP offers/answers
        via Firestore
    end note

    note right of connecting
        Exchanging ICE candidates
        via Firestore subcollections
    end note

    note right of connected
        DataChannel open
        Messages flow P2P
    end note
```

## Component Interaction Diagram

```mermaid
graph TB
    subgraph "Client Application"
        UI[React UI Component]
        STATE[React State<br/>roomId, role, connState]
        LOGIC[Connection Logic<br/>createRoom, joinRoom]
    end

    subgraph "WebRTC Module"
        PC[RTCPeerConnection]
        DC[RTCDataChannel]
        STUN[STUN Config]
    end

    subgraph "Firebase Module"
        DB[Firestore Database]
        LISTEN[onSnapshot Listeners]
    end

    subgraph "Server"
        API[Quick-Match API]
        QUEUE[Pairing Queue]
    end

    UI --> STATE
    UI --> LOGIC
    LOGIC --> PC
    LOGIC --> DB
    PC --> DC
    PC --> STUN
    DB --> LISTEN
    LISTEN --> LOGIC
    UI --> API
    API --> QUEUE

    style UI fill:#e1f5ff
    style PC fill:#e8f5e9
    style DB fill:#fff4e1
    style API fill:#fce4ec
```

## Message Protocol Structure

```mermaid
graph LR
    A[User Input] --> B[JSON Serialization]
    B --> C[DataChannel Send]
    C --> D[P2P Transmission]
    D --> E[DataChannel Receive]
    E --> F[JSON Parsing]
    F --> G[Display Message]

    B --> H["{ t: 'chat', text: string }"]

    style H fill:#fff9c4
```

## Firestore Data Structure

```mermaid
graph TB
    ROOT[Firestore Root]
    ROOT --> ROOMS[rooms Collection]
    ROOMS --> ROOM[rooms/roomId Document]

    ROOM --> FIELDS["Fields:<br/>- offer: { type, sdp }<br/>- answer: { type, sdp }<br/>- state: string<br/>- createdAt: timestamp<br/>- type: 'p2p-chat'"]

    ROOM --> CALLER[callerCandidates Subcollection]
    ROOM --> CALLEE[calleeCandidates Subcollection]

    CALLER --> CAND1["Documents:<br/>- candidate: string<br/>- sdpMid: string<br/>- sdpMLineIndex: number<br/>- usernameFragment: string"]

    CALLEE --> CAND2["Documents:<br/>- candidate: string<br/>- sdpMid: string<br/>- sdpMLineIndex: number<br/>- usernameFragment: string"]

    style ROOM fill:#fff4e1
    style CALLER fill:#e8f5e9
    style CALLEE fill:#e8f5e9
```
