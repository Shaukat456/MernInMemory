// Simple event emitter for simulating real-time updates

type EventCallback = (data: any) => void

class EventEmitter {
  private events: Map<string, EventCallback[]> = new Map()

  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(callback)
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(event: string, data: any): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data)
        } catch (error) {
          console.error("Event callback error:", error)
        }
      })
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event)
    } else {
      this.events.clear()
    }
  }
}

// Global event emitter instance
export const eventEmitter = new EventEmitter()

// Event types
export const EVENTS = {
  TASK_CREATED: "task:created",
  TASK_UPDATED: "task:updated",
  TASK_DELETED: "task:deleted",
  COMMENT_ADDED: "comment:added",
  PROJECT_UPDATED: "project:updated",
  USER_ASSIGNED: "user:assigned",
  NOTIFICATION_CREATED: "notification:created",
} as const

// Helper function to broadcast project events
export function broadcastToProject(projectId: string, event: string, data: any): void {
  eventEmitter.emit(`project:${projectId}:${event}`, data)
}

// Helper function to broadcast user events
export function broadcastToUser(userId: string, event: string, data: any): void {
  eventEmitter.emit(`user:${userId}:${event}`, data)
}
