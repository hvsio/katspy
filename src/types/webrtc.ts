export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'request-stream' | 'error'
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  message?: string
}

export interface ConnectionConfig {
  signalingUrl: string
  iceServers?: RTCIceServer[]
  constraints?: MediaStreamConstraints
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed'
