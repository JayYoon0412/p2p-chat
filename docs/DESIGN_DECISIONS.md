# Design Decisions

This document explains the key architectural and design choices made in this P2P chat application, along with the rationale and trade-offs considered.

## Why Firestore for Signaling?

### Decision

Use Firebase Firestore as the signaling mechanism for WebRTC connection setup.

### Rationale

1. **No Custom Server Required**: Firestore eliminates the need to build and maintain a custom WebSocket or HTTP signaling server. This reduces infrastructure complexity and deployment overhead.

2. **Real-time Synchronization**: Firestore's `onSnapshot` listeners provide real-time updates without polling, making it ideal for exchanging SDP offers/answers and ICE candidates asynchronously.

3. **Scalability**: Firestore scales automatically, handling concurrent room creation and signaling without manual scaling configuration.

4. **Simplicity**: The Firestore SDK is well-documented and easy to integrate, reducing development time.

5. **Cost-Effective**: For a project of this scale, Firestore's free tier is sufficient. Even at scale, costs are predictable and reasonable.

### Alternatives Considered

- **Custom WebSocket Server**: Would require building, deploying, and maintaining a server. More control but more complexity.
- **Socket.io**: Similar to WebSocket but adds abstraction layer. Still requires server infrastructure.
- **Server-Sent Events (SSE)**: One-way communication, not suitable for bidirectional signaling exchange.
- **HTTP Polling**: Simple but inefficient, adds latency, and increases server load.

### Trade-offs

- **Pros**:
  - Minimal infrastructure
  - Real-time updates
  - Easy to deploy
  - Managed service (no server maintenance)
- **Cons**:
  - Vendor lock-in (Firebase)
  - Requires internet connection (can't work offline)
  - Firestore read/write costs scale with usage
  - Less control over signaling logic

## Why WebRTC DataChannel?

### Decision

Use WebRTC's DataChannel API for peer-to-peer message transmission instead of relaying through a server.

### Rationale

1. **True P2P Communication**: DataChannel enables direct browser-to-browser communication, achieving the core goal of decentralized messaging without server relay.

2. **Low Latency**: Messages travel directly between peers, reducing latency compared to server-relayed messages.

3. **Reduced Server Load**: No server bandwidth or processing required for message relay, improving scalability.

4. **Built-in Encryption**: WebRTC uses DTLS (Datagram Transport Layer Security) for encrypted DataChannel communication, providing security without additional implementation.

5. **NAT Traversal**: WebRTC handles NAT traversal automatically using STUN/TURN servers, enabling connections across different networks.

### Alternatives Considered

- **WebSocket via Server**: Messages relayed through server. Simpler but defeats P2P goal, adds latency, increases server load.
- **Server-Sent Events**: One-way only, not suitable for bidirectional chat.
- **HTTP Polling**: High latency, inefficient, not real-time.
- **WebRTC Media Streams**: Designed for audio/video, overkill for text chat.

### Trade-offs

- **Pros**:
  - True P2P (no server relay)
  - Low latency
  - Built-in encryption
  - Scalable (no server bottleneck)
- **Cons**:
  - NAT traversal can fail without TURN servers
  - More complex connection setup
  - Connection can be unreliable on restrictive networks
  - Requires signaling mechanism (Firestore in our case)

## Why STUN Servers (Google & Twilio)?

### Decision

Use public STUN servers (Google and Twilio) for NAT traversal instead of deploying custom STUN/TURN servers.

### Rationale

1. **No Infrastructure Required**: Public STUN servers eliminate the need to deploy and maintain STUN/TURN infrastructure.

2. **Reliability**: Google and Twilio provide highly available, globally distributed STUN servers.

3. **Cost**: Free to use, no additional costs.

4. **Sufficient for Most Cases**: STUN servers handle most NAT traversal scenarios. TURN servers are only needed for restrictive networks (symmetric NATs, corporate firewalls).

### Alternatives Considered

- **Custom STUN/TURN Server**: More control but requires deployment and maintenance. Necessary for production-scale applications with strict network requirements.
- **Single STUN Server**: Less redundancy. Using multiple provides fallback options.

### Trade-offs

- **Pros**:
  - No infrastructure cost
  - Easy to implement
  - Sufficient for most networks
- **Cons**:
  - May fail on restrictive networks (symmetric NATs)
  - No TURN server for relay fallback
  - Dependency on third-party services
  - Less control over NAT traversal behavior

**Note**: The codebase includes a comment suggesting TURN servers could be added for reliability. This would improve connection success rate but adds complexity and cost.

## Why Minimal Server Role?

### Decision

Use server only for quick-match pairing, not for message relay or room management.

### Rationale

1. **True P2P Goal**: Keeping server minimal aligns with the project's goal of demonstrating decentralized communication. Messages should flow directly between peers.

2. **Scalability**: Server only handles pairing requests (lightweight), not message relay (heavy). This allows the system to scale to many concurrent chats without server bottlenecks.

3. **Cost Efficiency**: Minimal server usage reduces hosting costs and resource requirements.

4. **Separation of Concerns**: Server handles discovery/pairing (coordination), while peers handle communication (data transfer).

### What Server Does

- **Quick-Match Pairing**: Maintains in-memory queue to pair users who want to chat with strangers
- **Health Checks**: Provides endpoints for monitoring server status

### What Server Doesn't Do

- **Message Relay**: Messages flow directly P2P
- **Room Management**: Rooms are managed in Firestore, not server
- **Connection State**: WebRTC handles connection state, not server
- **User Authentication**: Not implemented (could be added)

### Alternatives Considered

- **Full Server Relay**: All messages go through server. Simpler but defeats P2P goal, adds latency, increases server load.
- **Server-Managed Rooms**: Server maintains room state. More control but adds complexity and server load.
- **No Server**: Pure P2P with manual room ID sharing only. More decentralized but no quick-match feature.

### Trade-offs

- **Pros**:
  - Aligns with P2P goals
  - Scalable (minimal server load)
  - Cost-effective
  - Simple server implementation
- **Cons**:
  - In-memory queue lost on server restart
  - No server-side room management
  - Limited to pairing functionality
  - No centralized logging/monitoring of messages

## Why Ordered DataChannel?

### Decision

Use ordered DataChannel (`ordered: true`) for message transmission.

### Rationale

1. **Message Ordering**: Ensures messages are received in the order they were sent, which is important for chat applications where context matters.

2. **Reliability**: Ordered channels provide better reliability guarantees, though at the cost of potential head-of-line blocking.

3. **Simplicity**: Ordered channels are simpler to reason about and implement than unordered channels with sequence numbers.

### Alternatives Considered

- **Unordered DataChannel**: Lower latency but requires implementing sequence numbers and reordering logic.
- **Multiple Channels**: Could use separate channels for different message types, but adds complexity.

### Trade-offs

- **Pros**:
  - Guaranteed message ordering
  - Simpler implementation
  - Better reliability
- **Cons**:
  - Potential head-of-line blocking
  - Slightly higher latency if packets are lost

## Why React + TypeScript?

### Decision

Use React with TypeScript for the client application.

### Rationale

1. **Type Safety**: TypeScript provides compile-time type checking, reducing runtime errors and improving code maintainability.

2. **Component-Based Architecture**: React's component model fits well with the UI requirements (room management, message display, connection status).

3. **Ecosystem**: Rich ecosystem of libraries and tools (Firebase SDK, WebRTC APIs work well with React).

4. **Modern Tooling**: Vite provides fast development experience and optimized production builds.

### Alternatives Considered

- **Vanilla JavaScript**: Simpler but lacks type safety and component structure.
- **Vue.js**: Similar benefits but team familiarity with React.
- **Angular**: More heavyweight, overkill for this project.

## Why NestJS for Server?

### Decision

Use NestJS framework for the minimal server implementation.

### Rationale

1. **TypeScript Support**: Consistent with client-side TypeScript usage.

2. **Structure**: NestJS provides good structure for even minimal servers, making it easy to add features later.

3. **Decorators**: Clean API definition with decorators (`@Controller`, `@Post`, etc.).

4. **Scalability**: Easy to extend if more server functionality is needed.

### Alternatives Considered

- **Express.js**: Simpler but less structure. Could work for minimal server.
- **Fastify**: Similar to Express but faster. Less familiar to team.
- **Serverless Functions**: Could use Firebase Functions, but adds Firebase dependency.

## Design Principles Summary

1. **Decentralization First**: Minimize server role, maximize P2P communication.
2. **Simplicity**: Choose managed services (Firestore) over custom infrastructure when possible.
3. **Type Safety**: Use TypeScript throughout for better code quality.
4. **Scalability**: Design for horizontal scaling (P2P messages, Firestore signaling).
5. **Cost Efficiency**: Use free/public services where possible (STUN servers, Firestore free tier).

## Future Improvements

Based on these design decisions, potential improvements include:

1. **TURN Servers**: Add TURN server configuration for better NAT traversal success rate.
2. **Server Persistence**: Replace in-memory queue with Redis or database for quick-match.
3. **Firebase Security Rules**: Implement proper Firestore security rules.
4. **Error Handling**: More robust error handling and reconnection logic.
5. **Message History**: Persist messages in Firestore for history (optional, breaks pure P2P).
6. **User Authentication**: Add authentication for user identification.
7. **Multiple DataChannels**: Use separate channels for different message types or priorities.
