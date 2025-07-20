<script setup lang="ts">
import WebRTCViewer from './components/WebRTCViewer.vue'
</script>

<template>
  <WebRTCViewer signaling-url="ws://localhost:8080/ws/sender" />
</template>


