export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthResponse {
  success: boolean
  token?: string
  message?: string
}

export interface ValidateTokenResponse {
  tokenValid: boolean
}

export const authenticate = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    const response = await fetch('http://localhost:8080/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials)
    })

    if (!response.ok || !(response.status >= 200 && response.status < 300)) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: AuthResponse = await response.json()
    data.success = true
    
    return data
  } catch (error) {
    console.error('Authentication request failed:', error)
    return { 
      success: false, 
      message: 'Unable to connect to authentication server' 
    }
  }
}

export const isAuthenticated = async (): Promise<boolean> => {
  const token = localStorage.getItem('authToken')
  if (!token) {
    return false
  }
  return validateToken(token)
}

const validateToken = async (token: string): Promise<boolean> => {
  try {
    console.log('validateToken', token)
    const response = await fetch('http://localhost:8080/auth/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    })

    if (!response.ok || !(response.status >= 200 && response.status < 300)) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: ValidateTokenResponse = await response.json()
    return data.tokenValid
  } catch (error) {
    console.error('Token validation request failed:', error)
    return false
  }
}