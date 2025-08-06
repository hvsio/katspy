<template>
  <div class="webrtc-viewer">
    <video ref="videoRef" class="video-element" autoplay muted playsinline />
    <div class="overlay">
      <div class="grey-button" :class="connectionState">
        <div class="status-indicator"></div>
        <span class="status-text">
          {{ connectionState.charAt(0).toUpperCase() + connectionState.slice(1) }}
        </span>
      </div>
      <button class="logout-button grey-button" @click="logout">
        <span>
          Logout
        </span>
      </button>
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
      <div v-if="connectionState !== 'connected'" class="no-video">
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

interface Props {
  signalingUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  signalingUrl: 'ws://localhost:8080/ws/sender'
})

const videoRef = ref<HTMLVideoElement>()
const connectionState = ref<'disconnected' | 'connecting' | 'connected' | 'failed' | 'closed' | 'new'>('disconnected')
const errorMessage = ref<string>('')

const requestVideoStart = async () => {
  try {
    const response = await fetch('http://localhost:8080/relay/start', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok || !(response.status >= 200 && response.status < 300)) {
      const body = await response.json()
      throw new Error(body.error)
    }
  } catch (error) {
    console.error('❌ Error requesting video start:', error)
  }
}

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
    connectionState.value = pc.connectionState
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      disconnect();
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log('🧊 ICE connection state:', pc.iceConnectionState);
  };

  ws.onopen = () => {
    console.log('🔌 WebSocket connected to backend');

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
  }

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
  if (videoRef.value) {
    videoRef.value.srcObject = null
  }

  connectionState.value = 'disconnected'
  errorMessage.value = ''
}

const logout = () => {
  localStorage.removeItem('authToken')
  localStorage.removeItem('username')
  disconnect()
  router.push('/login')
}

onMounted(() => {
  if (!videoRef.value?.srcObject) {
    requestVideoStart()
  }
  connect()
})

onUnmounted(() => {
  disconnect()
})
</script>

<style lang="scss" scoped>
@use '../scss/components/webrtc-viewer';
</style>
