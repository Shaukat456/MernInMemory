"use client"

import { useState, useEffect } from "react"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"

export default function HomePage() {
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [user, setUser] = useState<any>(null)
  const [sessionId, setSessionId] = useState<string>("")

  useEffect(() => {
    // Check for existing session
    const storedSessionId = localStorage.getItem("sessionId")
    if (storedSessionId) {
      validateSession(storedSessionId)
    }
  }, [])

  const validateSession = async (sessionId: string) => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.data)
        setSessionId(sessionId)
        // Redirect to dashboard
        window.location.href = "/dashboard"
      } else {
        localStorage.removeItem("sessionId")
      }
    } catch (error) {
      localStorage.removeItem("sessionId")
    }
  }

  const handleAuthSuccess = (userData: any, sessionId: string) => {
    console.log("[v0] Authentication successful:", { userData, sessionId })
    setUser(userData)
    setSessionId(sessionId)
    localStorage.setItem("sessionId", sessionId)
    // Redirect to dashboard
    console.log("[v0] Redirecting to dashboard")
    window.location.href = "/dashboard"
  }

  if (user) {
    return (
      <div className="min-h-screen bg-background grid-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background grid-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">TF</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-balance">Welcome to TaskFlow</h1>
          <p className="text-muted-foreground mt-2 text-balance">
            The complete platform for team collaboration and project management
          </p>
        </div>

        {authMode === "login" ? (
          <LoginForm onSuccess={handleAuthSuccess} onSwitchToRegister={() => setAuthMode("register")} />
        ) : (
          <RegisterForm onSuccess={handleAuthSuccess} onSwitchToLogin={() => setAuthMode("login")} />
        )}
      </div>
    </div>
  )
}
