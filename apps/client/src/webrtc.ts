export const rtcConfig: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:global.stun.twilio.com:3478',
      ],
    },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
};

export function createPeer() {
  return new RTCPeerConnection(rtcConfig);
}

export function sendJSON(dc: RTCDataChannel | null, obj: unknown) {
  if (dc && dc.readyState === 'open') dc.send(JSON.stringify(obj));
}
