<template>
  <div class="login-container">
    <Transition name="fade" mode="out-in">
      <div v-if="!isAuthenticated" class="login-form" key="login">
        <h2>Login</h2>
        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="username">Username:</label>
            <input
              id="username"
              v-model.trim="username"
              type="text"
              required
              placeholder="Enter username"
              :disabled="isLoading"
            />
          </div>
          <div class="form-group">
            <label for="password">Password:</label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              placeholder="Enter password"
              :disabled="isLoading"
            />
          </div>
          <button type="submit" :disabled="isLoading || !isFormValid">
            {{ isLoading ? 'Logging in...' : 'Login' }}
          </button>
          <Transition name="slide-down">
            <div v-if="error" class="error">{{ error }}</div>
          </Transition>
        </form>
      </div>
      <WebRTCViewer 
        v-else 
        key="viewer"
        signaling-url="ws://localhost:8080/ws/sender" 
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type Ref } from 'vue'
import WebRTCViewer from './WebRTCViewer.vue'

interface LoginCredentials {
  username: string
  password: string
}

const username: Ref<string> = ref('')
const password: Ref<string> = ref('')
const isAuthenticated: Ref<boolean> = ref(false)
const isLoading: Ref<boolean> = ref(false)
const error: Ref<string> = ref('')

const isFormValid = computed(() => 
  username.value.trim().length > 0 && password.value.length > 0
)

const authenticate = async (credentials: LoginCredentials): Promise<boolean> => {
  // TODO: Implement actual authentication logic
  console.log('Authenticating:', credentials.username)
  
  // Simulate API call
  await new Promise<void>(resolve => setTimeout(resolve, 1000))
  
  // For now, accept any non-empty credentials
  return credentials.username.length > 0 && credentials.password.length > 0
}

const handleLogin = async (): Promise<void> => {
  if (!isFormValid.value) return

  error.value = ''
  isLoading.value = true

  try {
    const credentials: LoginCredentials = {
      username: username.value.trim(),
      password: password.value
    }
    
    const success = await authenticate(credentials)
    
    if (success) {
      isAuthenticated.value = true
    } else {
      error.value = 'Invalid credentials'
    }
  } catch (err) {
    error.value = 'Authentication failed'
    console.error('Login error:', err)
  } finally {
    isLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
@use '../scss/components/login-page';
</style>
