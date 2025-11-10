# CS512 Final Project Paper

## Title
P2P Distributed Chat: A Decentralized Communication System

## Authors
- Arthur Chen (ac820)
- Shuqi Shen (ss1481)
- Jay Yoon (jy320)
- Jingheng Huan (jh730)

## Abstract
[Brief summary of the project, architecture, and key findings - ~150 words]

## 1. Introduction

### 1.1 Motivation
- Goal: Build a lightweight distributed communication system
- Demonstrate decentralized communication and real-time data synchronization
- Explore peer-to-peer technologies in web browsers

### 1.2 Problem Statement
- Traditional chat applications rely on central servers for message relay
- Need for true peer-to-peer communication without server bottlenecks
- Challenge of establishing direct browser-to-browser connections

### 1.3 Objectives
- Implement P2P messaging using WebRTC DataChannels
- Use minimal server role (only for pairing, not messaging)
- Demonstrate scalability through decentralized architecture

## 2. System Architecture

### 2.1 Overview
- Three-layer architecture: Signaling, P2P, and Client layers
- Reference: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

### 2.2 Signaling Layer (Firebase Firestore)
- Purpose: Facilitate WebRTC connection setup
- Implementation details
- Room-based signaling model
- SDP offer/answer exchange
- ICE candidate exchange

### 2.3 P2P Layer (WebRTC DataChannel)
- Direct browser-to-browser communication
- NAT traversal using STUN servers
- Connection establishment process
- Message transmission protocol

### 2.4 Client Application Layer
- React-based user interface
- Room management
- Connection state monitoring
- Message display and input

### 2.5 Server Role
- Minimal server implementation
- Quick-match pairing functionality
- Why minimal server role

## 3. Design Decisions

### 3.1 Why Firestore for Signaling?
- Reference: [docs/DESIGN_DECISIONS.md](docs/DESIGN_DECISIONS.md)
- Alternatives considered
- Trade-offs

### 3.2 Why WebRTC DataChannel?
- P2P communication benefits
- Low latency advantages
- Built-in encryption

### 3.3 Why STUN Servers?
- NAT traversal strategy
- Public STUN servers vs custom TURN servers
- Limitations

### 3.4 Why Minimal Server?
- Decentralization goals
- Scalability considerations
- Cost efficiency

## 4. Implementation Details

### 4.1 Technology Stack
- Frontend: React, TypeScript, Vite
- Backend: NestJS, TypeScript
- Signaling: Firebase Firestore
- P2P: WebRTC DataChannel API

### 4.2 Key Components
- Room creation and joining flow
- Quick-match pairing mechanism
- WebRTC connection establishment
- Message protocol and format

### 4.3 Connection Lifecycle
- State machine: idle → signaling → connecting → connected
- Error handling
- Reconnection logic (if implemented)

## 5. Challenges and Solutions

### 5.1 NAT Traversal
- Challenge: Establishing connections across different networks
- Solution: STUN servers for NAT discovery
- Limitations: Symmetric NATs may require TURN servers

### 5.2 Signaling Coordination
- Challenge: Exchanging connection information without direct connection
- Solution: Firestore real-time database
- Trade-offs: Requires internet connection, vendor dependency

### 5.3 Connection Reliability
- Challenge: Maintaining stable P2P connections
- Observations: Connection failures on restrictive networks
- Future improvements: TURN servers, better error handling

### 5.4 State Synchronization
- Challenge: Keeping UI in sync with connection state
- Solution: React state management and WebRTC event handlers

## 6. Testing and Evaluation

### 6.1 Testing Approach
- Unit tests for server endpoints
- E2E tests for quick-match functionality
- Manual testing of P2P connections

### 6.2 Test Scenarios
- Same network connections
- Different network connections
- NAT traversal success rate
- Connection stability

### 6.3 Performance Metrics
- Connection establishment time
- Message latency (P2P vs server-relayed)
- Scalability characteristics

### 6.4 Limitations Observed
- NAT traversal failures on restrictive networks
- In-memory queue lost on server restart
- No message persistence
- No user authentication

## 7. Future Improvements

### 7.1 TURN Servers
- Improve NAT traversal success rate
- Handle symmetric NATs and corporate firewalls

### 7.2 Message Persistence
- Optional message history in Firestore
- Trade-off: Breaks pure P2P model

### 7.3 User Authentication
- Add user identification
- Improve security and user experience

### 7.4 Enhanced Error Handling
- Better reconnection logic
- User-friendly error messages
- Connection retry mechanisms

### 7.5 Group Chat
- Support multiple peers in single room
- Mesh or star topology for P2P connections

## 8. Learning Outcomes

### 8.1 Distributed Systems Concepts
- Decentralized communication
- Peer-to-peer architectures
- Signaling and coordination

### 8.2 WebRTC Technology
- DataChannel API
- NAT traversal mechanisms
- Connection establishment process

### 8.3 Real-time Synchronization
- Firestore real-time updates
- State management in distributed systems

### 8.4 Trade-offs and Design Decisions
- Balancing simplicity vs functionality
- Managed services vs custom infrastructure
- P2P benefits vs reliability challenges

## 9. Conclusion

- Summary of achievements
- Key insights from the project
- Reflection on distributed systems principles
- Future work directions

## References

- WebRTC Specification: https://www.w3.org/TR/webrtc/
- Firebase Firestore Documentation: https://firebase.google.com/docs/firestore
- NestJS Documentation: https://docs.nestjs.com/
- React Documentation: https://react.dev/

## Appendix

### A. Architecture Diagrams
- Reference: [docs/diagrams/ARCHITECTURE_DIAGRAMS.md](docs/diagrams/ARCHITECTURE_DIAGRAMS.md)

### B. Code Repository
- GitHub repository link (if applicable)

### C. Deployment URLs
- Client deployment URL
- Server deployment URL

---

**Note**: This is a template/outline. Fill in the details based on your implementation experience and testing results. Target length: ≤10 pages.

