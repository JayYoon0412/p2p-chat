export const rtcConfig: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:global.stun.twilio.com:3478',
      ],
    },
    // Add TURN for reliability?
  ],
};

export function createPeer() {
  return new RTCPeerConnection(rtcConfig);
}

export function sendJSON(dc: RTCDataChannel | null, obj: unknown) {
  if (dc && dc.readyState === 'open') dc.send(JSON.stringify(obj));
}
