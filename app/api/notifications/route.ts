import type { NextRequest } from "next/server"
import { db } from "@/lib/database/memory-db"
import { ApiResponseBuilder, withAuth } from "@/lib/api/response-utils"

export const GET = withAuth(async (userId: string, request: NextRequest) => {
  const url = new URL(request.url)
  const unreadOnly = url.searchParams.get("unreadOnly") === "true"
  const limit = Number.parseInt(url.searchParams.get("limit") || "20")

  const notifications = db.getNotificationsByUser(userId, { unreadOnly, limit })

  return Response.json(ApiResponseBuilder.success(notifications, "Notifications retrieved successfully"))
})

export const PUT = withAuth(async (userId: string, request: NextRequest) => {
  const body = await request.json()
  const { action, notificationIds } = body

  if (action === "markAsRead") {
    const results = notificationIds.map((id: string) => db.markNotificationAsRead(id, userId))

    const successCount = results.filter(Boolean).length

    return Response.json(
      ApiResponseBuilder.success({ marked: successCount }, `${successCount} notifications marked as read`),
    )
  }

  if (action === "markAllAsRead") {
    const count = db.markAllNotificationsAsRead(userId)
    return Response.json(ApiResponseBuilder.success({ marked: count }, `${count} notifications marked as read`))
  }

  return Response.json(ApiResponseBuilder.error("Invalid action"), { status: 400 })
})
