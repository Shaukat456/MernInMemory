"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { toast } from "sonner"

interface RealtimeContextType {
  isConnected: boolean
  subscribe: (projectId: string) => void
  unsubscribe: () => void
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error("useRealtime must be used within a RealtimeProvider")
  }
  return context
}

interface RealtimeProviderProps {
  children: ReactNode
  userId: string
}

export function RealtimeProvider({ children, userId }: RealtimeProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [eventSource, setEventSource] = useState<EventSource | null>(null)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)

  const subscribe = (projectId: string) => {
    // Don't reconnect if already connected to the same project
    if (currentProjectId === projectId && eventSource) {
      return
    }

    // Close existing connection
    unsubscribe()

    try {
      const sessionId = localStorage.getItem("sessionId")
      if (!sessionId) return

      const url = `/api/realtime/subscribe?projectId=${projectId}`
      const source = new EventSource(url)

      source.onopen = () => {
        setIsConnected(true)
        setCurrentProjectId(projectId)
        console.log("[Realtime] Connected to project:", projectId)
      }

      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleRealtimeEvent(data)
        } catch (error) {
          console.error("[Realtime] Failed to parse message:", error)
        }
      }

      source.onerror = (error) => {
        console.error("[Realtime] Connection error:", error)
        setIsConnected(false)

        // Attempt to reconnect after a delay
        setTimeout(() => {
          if (currentProjectId) {
            subscribe(currentProjectId)
          }
        }, 5000)
      }

      setEventSource(source)
    } catch (error) {
      console.error("[Realtime] Failed to establish connection:", error)
    }
  }

  const unsubscribe = () => {
    if (eventSource) {
      eventSource.close()
      setEventSource(null)
      setIsConnected(false)
      setCurrentProjectId(null)
      console.log("[Realtime] Disconnected")
    }
  }

  const handleRealtimeEvent = (data: any) => {
    switch (data.type) {
      case "connected":
        console.log("[Realtime] Connection established")
        break

      case "heartbeat":
        // Keep connection alive
        break

      case "project_update":
        handleProjectUpdate(data.data)
        break

      case "user_notification":
        handleUserNotification(data.data)
        break

      default:
        console.log("[Realtime] Unknown event type:", data.type)
    }
  }

  const handleProjectUpdate = (data: any) => {
    // Dispatch custom events for components to listen to
    window.dispatchEvent(
      new CustomEvent("project-update", {
        detail: data,
      }),
    )

    // Show toast notifications for important updates
    if (data.type === "task_created") {
      toast.success("New task created", {
        description: `"${data.metadata.taskTitle}" was added to the project`,
      })
    } else if (data.type === "task_updated") {
      toast.info("Task updated", {
        description: `A task was updated in the project`,
      })
    } else if (data.type === "comment_added") {
      toast.info("New comment", {
        description: `Someone added a comment`,
      })
    }
  }

  const handleUserNotification = (data: any) => {
    // Dispatch notification events
    window.dispatchEvent(
      new CustomEvent("user-notification", {
        detail: data,
      }),
    )

    // Show toast for important notifications
    toast.info(data.title, {
      description: data.message,
    })
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        subscribe,
        unsubscribe,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  )
}
