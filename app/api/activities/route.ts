import type { NextRequest } from "next/server"
import { db } from "@/lib/database/memory-db"
import { ApiResponseBuilder, withAuth } from "@/lib/api/response-utils"

export const GET = withAuth(async (userId: string, request: NextRequest) => {
  const url = new URL(request.url)
  const projectId = url.searchParams.get("projectId")
  const limit = Number.parseInt(url.searchParams.get("limit") || "50")

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

  const activities = db.getActivitiesByProject(projectId, limit)

  // Enrich activities with user information
  const enrichedActivities = activities.map((activity) => ({
    ...activity,
    user: db.getUserById(activity.userId),
    task: activity.taskId ? db.getTaskById(activity.taskId) : null,
  }))

  return Response.json(ApiResponseBuilder.success(enrichedActivities, "Activities retrieved successfully"))
})
