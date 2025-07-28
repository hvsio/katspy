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

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.login-form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.login-form h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #333;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

button {
  width: 100%;
  padding: 0.75rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover:not(:disabled) {
  background-color: #0056b3;
}

button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.error {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  text-align: center;
}

/* Vue 3 Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
