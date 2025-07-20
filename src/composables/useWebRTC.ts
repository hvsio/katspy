import { ref, onUnmounted, readonly } from 'vue'
import type { ConnectionState, SignalingMessage, ConnectionConfig } from '../types/webrtc'

export function useWebRTC(config: ConnectionConfig) {
  const connectionState = ref<ConnectionState>('disconnected')
  const errorMessage = ref<string>('')
  const remoteStream = ref<MediaStream | null>(null)

  let peerConnection: RTCPeerConnection | null = null
  let websocket: WebSocket | null = null

  const defaultIceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]

  const createPeerConnection = (): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ 
      iceServers: config.iceServers || defaultIceServers 
    })
    
    pc.onicecandidate = (event) => {
      if (event.candidate && websocket?.readyState === WebSocket.OPEN) {
        const message: SignalingMessage = {
          type: 'ice-candidate',
          candidate: event.candidate
        }
        websocket.send(JSON.stringify(message))
      }
    }
    
    pc.ontrack = (event) => {
      if (event.streams[0]) {
        remoteStream.value = event.streams[0]
        connectionState.value = 'connected'
      }
    }
    
    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case 'connected':
          connectionState.value = 'connected'
          errorMessage.value = ''
          break
        case 'disconnected':
        case 'closed':
          connectionState.value = 'disconnected'
          break
        case 'failed':
          connectionState.value = 'failed'
          errorMessage.value = 'WebRTC connection failed'
          break
      }
    }
    
    return pc
  }

  const handleSignalingMessage = async (message: SignalingMessage) => {
    try {
      switch (message.type) {
        case 'offer':
          if (!peerConnection) {
            peerConnection = createPeerConnection()
          }
          
          if (message.offer) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer))
            const answer = await peerConnection.createAnswer()
            await peerConnection.setLocalDescription(answer)
            
            const response: SignalingMessage = {
              type: 'answer',
              answer: answer
            }
            websocket?.send(JSON.stringify(response))
          }
          break
          
        case 'ice-candidate':
          if (peerConnection && message.candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate))
          }
          break
          
        case 'error':
          errorMessage.value = message.message || 'Server error'
          connectionState.value = 'failed'
          break
      }
    } catch (error) {
      console.error('Error processing signaling message:', error)
      errorMessage.value = 'Failed to process server message'
      connectionState.value = 'failed'
    }
  }

  const connect = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      disconnect()
      
      try {
        websocket = new WebSocket(config.signalingUrl)
        
        websocket.onopen = () => {
          connectionState.value = 'connecting'
          
          const message: SignalingMessage = {
            type: 'request-stream'
          }
          websocket?.send(JSON.stringify(message))
          resolve()
        }
        
        websocket.onmessage = async (event) => {
          try {
            const message: SignalingMessage = JSON.parse(event.data)
            await handleSignalingMessage(message)
          } catch (error) {
            console.error('Error parsing message:', error)
          }
        }
        
        websocket.onerror = (error) => {
          console.error('WebSocket error:', error)
          errorMessage.value = 'Failed to connect to signaling server'
          connectionState.value = 'failed'
          reject(error)
        }
        
        websocket.onclose = () => {
          connectionState.value = 'disconnected'
        }
        
      } catch (error) {
        errorMessage.value = 'Invalid signaling server URL'
        connectionState.value = 'failed'
        reject(error)
      }
    })
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
    
    remoteStream.value = null
    connectionState.value = 'disconnected'
    errorMessage.value = ''
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    connectionState: readonly(connectionState),
    errorMessage: readonly(errorMessage),
    remoteStream: readonly(remoteStream),
    connect,
    disconnect
  }
}
