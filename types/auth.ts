export interface AuthUser {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at?: string
}

export interface SignupFormData {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

export interface LoginFormData {
  email: string
  password: string
}

export interface ForgotPasswordFormData {
  email: string
}

export interface ResetPasswordFormData {
  password: string
  confirmPassword: string
}
