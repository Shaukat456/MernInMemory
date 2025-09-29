// Authentication utilities with JWT-like session management

import { db } from "../database/memory-db"
import type { User } from "../database/schema"

export interface AuthResult {
  success: boolean
  user?: User
  sessionId?: string
  error?: string
}

export class AuthService {
  static async login(email: string, password: string): Promise<AuthResult> {
    // Simulate password checking (in real app, use bcrypt)
    const user = db.getUserByEmail(email)

    if (!user) {
      return { success: false, error: "Invalid credentials" }
    }

    // For demo purposes, accept any password for existing users
    const sessionId = db.createSession(user.id)

    // Update last active
    db.updateUser(user.id, { lastActive: new Date() })

    return {
      success: true,
      user,
      sessionId,
    }
  }

  static async register(userData: {
    email: string
    username: string
    firstName: string
    lastName: string
    password: string
  }): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = db.getUserByEmail(userData.email)
    if (existingUser) {
      return { success: false, error: "User already exists" }
    }

    try {
      const user = db.createUser({
        email: userData.email,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: "member",
        preferences: {
          theme: "light",
          notifications: true,
          timezone: "UTC",
        },
      })

      const sessionId = db.createSession(user.id)

      return {
        success: true,
        user,
        sessionId,
      }
    } catch (error) {
      return { success: false, error: "Registration failed" }
    }
  }

  static validateSession(sessionId: string): User | null {
    const userId = db.validateSession(sessionId)
    return userId ? db.getUserById(userId) : null
  }

  static logout(sessionId: string): void {
    // In a real implementation, we'd remove the session from the database
    // For now, we'll just let it expire naturally
  }
}
