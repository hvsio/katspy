<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  signalingUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  signalingUrl: 'ws://localhost:8080/ws/sender'
})

const videoRef = ref<HTMLVideoElement>()
const connectionState = ref<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected')
const errorMessage = ref<string>('')

let peerConnection: RTCPeerConnection | null = null
let websocket: WebSocket | null = null

const setupConnection = (): RTCPeerConnection => {
  const ws = new WebSocket(props.signalingUrl);
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  });

  // IMPORTANT: Add transceivers for receiving media BEFORE creating offer
  // This ensures the SDP will contain proper ICE parameters
  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });
  console.log('📺 Added video and audio transceivers (recvonly)');

  // Handle incoming media tracks
  pc.ontrack = (event) => {
    console.log('📺 Received track:', event.track.kind);
    if (event.track.kind === 'video' && videoRef.value) {
      videoRef.value.srcObject = event.streams[0];
    } else if (event.track.kind === 'audio') {
      console.log('🔊 Audio track received');
    }
  };

  // Handle ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
      console.log('🧊 Sending ICE candidate');
      ws.send(JSON.stringify({
        type: 'ice-candidate',
        candidate: event.candidate
      }));
    }
  };

  // Monitor connection state changes
  pc.onconnectionstatechange = () => {
    console.log('🔗 Connection state:', pc.connectionState);

    if (pc.connectionState === 'connected') {
    } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      disconnect();
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log('🧊 ICE connection state:', pc.iceConnectionState);
  };

  // Create WebSocket connection

  ws.onopen = () => {
    console.log('🔌 WebSocket connected to backend');

    // Small delay to ensure backend is ready
    setTimeout(() => {
      // Create offer to start WebRTC negotiation
      pc.createOffer()
        .then(offer => {
          console.log('📤 Created offer');
          console.log('📄 Offer SDP length:', offer?.sdp?.length);

          // Validate offer has ICE parameters
          if (!offer?.sdp?.includes('ice-ufrag') || !offer?.sdp?.includes('ice-pwd')) {
            throw new Error('Generated offer missing ICE credentials');
          }

          return pc.setLocalDescription(offer);
        })
        .then(() => {
          console.log('📤 Local description set, sending offer to backend');
          ws.send(JSON.stringify({
            type: 'offer',
            sdp: pc?.localDescription?.sdp
          }));
        })
        .catch(err => {
          console.error('❌ Error creating/sending offer:', err);
        });
    }, 100);
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('📥 Received message:', message.type, message);

    if (message.type === 'answer') {
      console.log('📥 Received answer from backend');
      console.log('📄 SDP Content:', message.sdp);

      // Validate SDP has required ICE parameters
      if (!message.sdp.includes('ice-ufrag') || !message.sdp.includes('ice-pwd')) {
        console.error('❌ Invalid SDP: Missing ICE credentials');
        return;
      }

      pc.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: message.sdp
      })).then(() => {
        console.log('✅ Set remote description successfully');
      }).catch(err => {
        console.error('❌ Error setting remote description:', err);
        console.error('📄 Problematic SDP:', message.sdp);
      });
    } else if (message.type === 'ice-candidate') {
      console.log('🧊 Received ICE candidate from backend');
      pc.addIceCandidate(new RTCIceCandidate(message.candidate))
        .catch(err => console.error('❌ Error adding ICE candidate:', err));
    }
  };

  ws.onclose = () => {
    console.log('🔌 WebSocket disconnected');
  };

  ws.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
  };

  return pc
}

const connect = () => {
  disconnect()
  setupConnection()
}

const disconnect = () => {
  if (peerConnection) {
    peerConnection.close()
    peerConnection = null
  }

  if (websocket) {
    websocket.close()
    websocket = null
  }

  if (videoRef.value) {
    videoRef.value.srcObject = null
  }

  connectionState.value = 'disconnected'
  errorMessage.value = ''
}

onMounted(() => {
  connect()
})

onUnmounted(() => {
  disconnect()
})
</script>

<template>
  <div class="webrtc-viewer">
    <video ref="videoRef" class="video-element" autoplay muted playsinline />

    <div class="overlay">
      <div class="connection-status" :class="connectionState">
        <div class="status-indicator"></div>
        <span class="status-text">
          {{ connectionState === 'connecting' ? 'Connecting...' :
            connectionState === 'connected' ? 'Connected' :
              connectionState === 'failed' ? 'Connection Failed' :
                'Disconnected' }}
        </span>
      </div>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <div class="controls">
        <button @click="connect" :disabled="connectionState === 'connecting'" class="btn-primary">
          {{ connectionState === 'connected' ? 'Reconnect' : 'Connect' }}
        </button>

        <button @click="disconnect" :disabled="connectionState === 'disconnected'" class="btn-secondary">
          Disconnect
        </button>
      </div>
    </div>

    <div v-if="connectionState !== 'connected'" class="no-video">
      <div class="placeholder">
        <h2>WebRTC Video Stream</h2>
        <p v-if="connectionState === 'disconnected'">
          Click Connect to start receiving video stream
        </p>
        <p v-else-if="connectionState === 'connecting'">
          Establishing connection...
        </p>
        <p v-else-if="connectionState === 'failed'">
          {{ errorMessage || 'Connection failed' }}
        </p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../assets/styles/variables' as *;
@use 'sass:color';

.webrtc-viewer {
  width: 100vw;
  height: 100vh;
  position: relative;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.overlay {
  position: absolute;
  top: $spacing-md;
  left: $spacing-md;
  right: $spacing-md;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  pointer-events: none;

  >* {
    pointer-events: auto;
  }
}

.connection-status {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: $spacing-sm $spacing-md;
  border-radius: $border-radius;
  font-size: $font-size-small;

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #666;

    .disconnected & {
      background: #666;
    }

    .connecting & {
      background: #f39c12;
      animation: pulse 1.5s infinite;
    }

    .connected & {
      background: #27ae60;
    }

    .failed & {
      background: #e74c3c;
    }
  }
}

.error-message {
  background: rgba(231, 76, 60, 0.9);
  color: white;
  padding: $spacing-sm $spacing-md;
  border-radius: $border-radius;
  font-size: $font-size-small;
  max-width: 300px;
}

.controls {
  display: flex;
  gap: $spacing-sm;

  button {
    padding: $spacing-sm $spacing-md;
    border-radius: $border-radius;
    font-size: $font-size-small;
    cursor: pointer;
    transition: all 0.2s;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .btn-primary {
    background: $color-secondary;
    color: white;
    border: none;

    &:hover:not(:disabled) {
      background: color.adjust($color-secondary, $lightness: -10%);
    }
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

.no-video {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  z-index: 5;

  .placeholder {
    background: rgba(0, 0, 0, 0.8);
    padding: $spacing-xl;
    border-radius: $border-radius-large;

    h2 {
      margin: 0 0 $spacing-md 0;
      font-size: $font-size-large;
    }

    p {
      margin: 0;
      opacity: 0.8;
    }
  }
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}
</style>
