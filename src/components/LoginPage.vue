<template>
  <div class="login-container">
    <div class="login-form">
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { authenticate, type LoginCredentials } from '../../composables/auth'

const router = useRouter()

const username: Ref<string> = ref('')
const password: Ref<string> = ref('')
const isLoading: Ref<boolean> = ref(false)
const error: Ref<string> = ref('')

const isFormValid = computed(() => 
  username.value.trim().length > 0 && password.value.length > 0
)

// const hashPassword = async (password: string): Promise<string> => {
//   const saltRounds = 12
//   return await bcrypt.hash(password, saltRounds)
// }

const handleLogin = async (): Promise<void> => {
  if (!isFormValid.value) return

  error.value = ''
  isLoading.value = true

  try {
    const credentials: LoginCredentials = {
      username: username.value.trim(),
      password: password.value
    }
    
    const authResult = await authenticate(credentials)
    
    if (authResult.token) {
      localStorage.setItem('authToken', authResult.token)
      localStorage.setItem('username', username.value.trim())
      router.push('/viewer')
    } else {
      error.value = authResult.message || 'Invalid credentials'
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
