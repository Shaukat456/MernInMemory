import type { NextRequest } from "next/server"
import { db } from "@/lib/database/memory-db"
import { eventEmitter, EVENTS } from "@/lib/realtime/event-emitter"
import { ApiResponseBuilder, withAuth } from "@/lib/api/response-utils"

export const GET = withAuth(async (userId: string, request: NextRequest) => {
  const url = new URL(request.url)
  const projectId = url.searchParams.get("projectId")

  if (!projectId) {
    return Response.json(ApiResponseBuilder.error("Project ID is required"), { status: 400 })
  }

  // Check project access
  const project = db.getProjectById(projectId)
  if (!project) {
    return Response.json(ApiResponseBuilder.error("Project not found"), { status: 404 })
  }

  const hasAccess = project.ownerId === userId || project.memberIds.includes(userId)
  if (!hasAccess) {
    return Response.json(ApiResponseBuilder.error("Access denied"), { status: 403 })
  }

  // Create Server-Sent Events stream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({
        type: "connected",
        timestamp: new Date().toISOString(),
      })}\n\n`
      controller.enqueue(encoder.encode(initialMessage))

      // Set up event listeners for this project
      const projectEventHandler = (data: any) => {
        const message = `data: ${JSON.stringify({
          type: "project_update",
          data,
          timestamp: new Date().toISOString(),
        })}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      const userEventHandler = (data: any) => {
        const message = `data: ${JSON.stringify({
          type: "user_notification",
          data,
          timestamp: new Date().toISOString(),
        })}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      // Subscribe to project events
      eventEmitter.on(`project:${projectId}:${EVENTS.TASK_CREATED}`, projectEventHandler)
      eventEmitter.on(`project:${projectId}:${EVENTS.TASK_UPDATED}`, projectEventHandler)
      eventEmitter.on(`project:${projectId}:${EVENTS.COMMENT_ADDED}`, projectEventHandler)

      // Subscribe to user events
      eventEmitter.on(`user:${userId}:${EVENTS.NOTIFICATION_CREATED}`, userEventHandler)

      // Keep connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        const heartbeatMessage = `data: ${JSON.stringify({
          type: "heartbeat",
          timestamp: new Date().toISOString(),
        })}\n\n`
        controller.enqueue(encoder.encode(heartbeatMessage))
      }, 30000) // Every 30 seconds

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        eventEmitter.off(`project:${projectId}:${EVENTS.TASK_CREATED}`, projectEventHandler)
        eventEmitter.off(`project:${projectId}:${EVENTS.TASK_UPDATED}`, projectEventHandler)
        eventEmitter.off(`project:${projectId}:${EVENTS.COMMENT_ADDED}`, projectEventHandler)
        eventEmitter.off(`user:${userId}:${EVENTS.NOTIFICATION_CREATED}`, userEventHandler)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  })
})
