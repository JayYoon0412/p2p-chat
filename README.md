# P2P Distributed Chat

A lightweight, distributed, peer-to-peer (P2P) communication system that enables direct message flow between browsers without a central relay server. Built for CS512 Distributed Systems course to demonstrate decentralized communication and real-time data synchronization.

## Overview

This project implements a true peer-to-peer chat application where messages flow directly between browsers using WebRTC DataChannels. The system uses Firebase Firestore only for initial connection signaling, after which all communication happens directly between peers without server intervention.

### Key Features

- **True P2P Communication**: Messages flow directly between browsers, no server relay
- **Room-Based Chat**: Create or join chat rooms using room IDs
- **Quick-Match**: Automatically pair with other users for instant chat
- **Real-Time Connection Status**: Monitor WebRTC connection state in real-time
- **Decentralized Architecture**: Minimal server role (only for pairing, not messaging)
- **Low Latency**: Direct peer connections reduce message latency

## Architecture

The system uses a three-layer architecture:

1. **Signaling Layer (Firebase Firestore)**: Facilitates initial WebRTC connection setup by exchanging SDP offers/answers and ICE candidates
2. **P2P Layer (WebRTC DataChannel)**: Enables direct, encrypted browser-to-browser communication after signaling completes
3. **Client Application Layer (React)**: Provides user interface for room management and messaging

The server (NestJS) plays a minimal role - only facilitating quick-match pairing between users. Once paired, all communication happens directly P2P.

### Architecture Highlights

- **Signaling**: Firestore documents (`rooms/{id}`) with subcollections for ICE candidates
- **P2P Connection**: Single ordered DataChannel named `chat` for message transmission
- **NAT Traversal**: Uses public STUN servers (Google, Twilio) for connection establishment
- **Connection States**: `idle` → `signaling` → `connecting` → `connected`

For detailed architecture documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: NestJS (Node.js), TypeScript
- **Signaling**: Firebase Firestore
- **P2P**: WebRTC DataChannel API
- **STUN Servers**: Google STUN, Twilio STUN
- **Deployment**: Firebase Hosting (client), Render/Fly.io/Cloud Run (server)

## Prerequisites

- Node.js 18+ and npm
- Firebase account and project
- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Configuration

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Copy your Firebase configuration
4. Update `apps/client/src/firebase.ts` with your Firebase config:

```typescript
export const firebaseConfig = {
  apiKey: 'your-api-key',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project-id',
  // ... other config
};
```

### 3. Environment Variables

Create `.env` files for client and server (see `.env.example` files for templates):

**Client** (`apps/client/.env`):

```
VITE_API_BASE_URL=http://localhost:3001
```

**Server** (`apps/server/.env`):

```
PORT=3001
```

### 4. Run Development Server

Start both client and server concurrently:

```bash
npm run dev
```

This will start:

- Client on `http://localhost:5173`
- Server on `http://localhost:3001`

## Usage Guide

### Creating a Room

1. Click **"Create Room"** button
2. Share the generated Room ID with your peer
3. Wait for peer to join (connection status updates automatically)

### Joining a Room

1. Enter the Room ID in the input field
2. Click **"Join"** button
3. Connection will establish automatically

### Quick-Match

1. Click **"Quick-Match"** button
2. System will automatically pair you with another waiting user
3. If no one is waiting, you become the host and wait for pairing
4. Once paired, connection establishes automatically

### Sending Messages

1. Wait for connection state to show **"connected"**
2. Type your message in the input field
3. Press Enter or click **"Send"**
4. Messages appear in real-time for both peers

## Deployment

### Client Deployment (Firebase Hosting)

1. **Install Firebase CLI** (if not already installed):

   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:

   ```bash
   firebase login
   ```

3. **Build the client**:

   ```bash
   npm run build:client
   ```

   This creates a `dist` folder in `apps/client/dist` with production assets.

4. **Configure Firebase** (if needed):
   - Ensure `firebase.json` and `.firebaserc` are configured
   - Update `.firebaserc` with your Firebase project ID if different

5. **Deploy to Firebase Hosting**:

   ```bash
   firebase deploy --only hosting
   ```

6. **Set Environment Variables** (after server deployment):
   - In Firebase Console, go to Hosting → Environment Variables
   - Set `VITE_API_BASE_URL` to your server URL
   - Set Firebase config variables if using environment variables

### Server Deployment

#### Option 1: Render.com

1. **Connect Repository**: Connect your GitHub repository to Render
2. **Create Web Service**:
   - Use `render.yaml` configuration file
   - Or manually configure:
     - Build Command: `npm install && npm run build`
     - Start Command: `node dist/apps/server/main.js`
3. **Set Environment Variables**:
   - `PORT`: 3001 (or let Render assign)
   - `NODE_ENV`: production

#### Option 2: Docker Deployment

1. **Build Docker Image**:

   ```bash
   docker build -t p2p-chat-server .
   ```

2. **Run Container**:

   ```bash
   docker run -p 3001:3001 -e PORT=3001 p2p-chat-server
   ```

3. **Deploy to Platform**: Use Dockerfile with platforms like Fly.io, Railway, or Google Cloud Run

#### Option 3: Google Cloud Run

1. **Build and Push**:

   ```bash
   gcloud builds submit --tag gcr.io/PROJECT_ID/p2p-chat-server
   ```

2. **Deploy**:
   ```bash
   gcloud run deploy p2p-chat-server --image gcr.io/PROJECT_ID/p2p-chat-server --port 3001
   ```

### Post-Deployment Configuration

1. **Update Client Environment Variables**:
   - Set `VITE_API_BASE_URL` in Firebase Hosting to point to deployed server URL
   - Redeploy client if needed

2. **Configure CORS**:
   - Update server CORS settings in `apps/server/src/main.ts` to allow your Firebase Hosting domain

3. **Firestore Security Rules**:
   - Configure Firestore security rules to allow read/write access:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /rooms/{roomId} {
         allow read, write: if true; // Adjust based on your security needs
       }
     }
   }
   ```

### Production Environment Variables

**Client** (set in Firebase Hosting):

- `VITE_API_BASE_URL`: Your deployed server URL (e.g., `https://p2p-chat-server.onrender.com`)
- `VITE_FIREBASE_*`: Firebase configuration (if using env vars)

**Server** (set in deployment platform):

- `PORT`: Server port (usually auto-assigned)
- `NODE_ENV`: production

```
p2p-chat/
├── apps/
│   ├── client/          # React frontend application
│   │   ├── src/
│   │   │   ├── ui/      # React components
│   │   │   ├── firebase.ts
│   │   │   └── webrtc.ts
│   │   └── vite.config.ts
│   └── server/          # NestJS backend (quick-match only)
│       └── src/
│           ├── route.controller.ts
│           └── main.ts
├── docs/                # Documentation
│   ├── ARCHITECTURE.md
│   ├── DESIGN_DECISIONS.md
│   └── diagrams/
└── README.md
```

## Development

### Available Scripts

- `npm run dev` - Start client and server in development mode
- `npm run start:client:dev` - Start client only
- `npm run start:server:dev` - Start server only
- `npm run build:client` - Build client for production
- `npm run build:server` - Build server for production
- `npm run build` - Build server (NestJS default)
- `npm run lint` - Run ESLint

### Key Files

- **Client**: `apps/client/src/ui/App.tsx` - Main React component
- **WebRTC**: `apps/client/src/webrtc.ts` - WebRTC configuration
- **Firebase**: `apps/client/src/firebase.ts` - Firestore setup
- **Server**: `apps/server/src/route.controller.ts` - Quick-match endpoint

## Architecture Documentation

For detailed information about the system architecture and design decisions:

- [Architecture Documentation](docs/ARCHITECTURE.md) - Detailed system architecture
- [Design Decisions](docs/DESIGN_DECISIONS.md) - Rationale for architectural choices
- [Architecture Diagrams](docs/diagrams/ARCHITECTURE_DIAGRAMS.md) - Visual diagrams

## Connection States

The application tracks connection state through the WebRTC lifecycle:

- **idle**: No active connection
- **signaling**: Exchanging SDP offers/answers via Firestore
- **connecting**: ICE candidates being exchanged
- **connected**: P2P connection established, DataChannel open
- **disconnected**: Connection closed
- **failed**: Connection failed (NAT traversal issues, network problems)

## Troubleshooting

### Connection Fails

- **Check Firestore**: Ensure Firebase project is configured correctly
- **Check STUN**: Verify STUN servers are accessible (may be blocked by firewall)
- **Network**: Some networks (corporate firewalls, symmetric NATs) may require TURN servers
- **Browser**: Ensure browser supports WebRTC DataChannel

### Quick-Match Not Working

- **Check Server**: Ensure server is running on correct port
- **Check API URL**: Verify `VITE_API_BASE_URL` matches server port
- **Route**: Ensure client calls `/quick-match` endpoint

### Messages Not Sending

- **Connection State**: Verify connection state is "connected"
- **DataChannel**: Check browser console for DataChannel errors
- **Firestore**: Ensure Firestore rules allow read/write access

## Design Principles

1. **Decentralization First**: Minimize server role, maximize P2P communication
2. **Simplicity**: Use managed services (Firestore) over custom infrastructure
3. **Type Safety**: TypeScript throughout for better code quality
4. **Scalability**: Design for horizontal scaling (P2P messages, Firestore signaling)

## Future Improvements

- Add TURN servers for better NAT traversal success rate
- Implement message history persistence
- Add user authentication
- Improve error handling and reconnection logic
- Add support for file sharing via DataChannel
- Implement group chat (multiple peers)

## License

This project is part of CS512 Distributed Systems course work.

## Team

- Arthur Chen (ac820)
- Shuqi Shen (ss1481)
- Jay Yoon (jy320)
- Jingheng Huan (jh730)
