import type { NextRequest } from "next/server"
import { db } from "@/lib/database/memory-db"
import { ApiResponseBuilder, withAuth } from "@/lib/api/response-utils"

export const GET = withAuth(async (userId: string, request: NextRequest, { params }: { params: { id: string } }) => {
  const task = db.getTaskById(params.id)

  if (!task) {
    return Response.json(ApiResponseBuilder.error("Task not found"), { status: 404 })
  }

  // Check project access
  const project = db.getProjectById(task.projectId)
  if (!project) {
    return Response.json(ApiResponseBuilder.error("Project not found"), { status: 404 })
  }

  const hasAccess = project.ownerId === userId || project.memberIds.includes(userId)
  if (!hasAccess) {
    return Response.json(ApiResponseBuilder.error("Access denied"), { status: 403 })
  }

  // Enrich task with full details
  const assignee = task.assigneeId ? db.getUserById(task.assigneeId) : null
  const creator = db.getUserById(task.creatorId)

  const enrichedTask = {
    ...task,
    project: {
      id: project.id,
      name: project.name,
    },
    assignee: assignee
      ? {
          id: assignee.id,
          firstName: assignee.firstName,
          lastName: assignee.lastName,
          avatar: assignee.avatar,
        }
      : null,
    creator: creator
      ? {
          id: creator.id,
          firstName: creator.firstName,
          lastName: creator.lastName,
          avatar: creator.avatar,
        }
      : null,
    comments: task.comments.map((comment) => ({
      ...comment,
      user: db.getUserById(comment.userId),
    })),
  }

  return Response.json(ApiResponseBuilder.success(enrichedTask, "Task retrieved successfully"))
})

export const PUT = withAuth(async (userId: string, request: NextRequest, { params }: { params: { id: string } }) => {
  const task = db.getTaskById(params.id)

  if (!task) {
    return Response.json(ApiResponseBuilder.error("Task not found"), { status: 404 })
  }

  // Check project access
  const project = db.getProjectById(task.projectId)
  if (!project) {
    return Response.json(ApiResponseBuilder.error("Project not found"), { status: 404 })
  }

  const hasAccess = project.ownerId === userId || project.memberIds.includes(userId)
  if (!hasAccess) {
    return Response.json(ApiResponseBuilder.error("Access denied"), { status: 403 })
  }

  const body = await request.json()
  const updates: any = {}

  // Handle specific field updates
  if (body.title !== undefined) updates.title = body.title.trim()
  if (body.description !== undefined) updates.description = body.description.trim()
  if (body.status !== undefined) updates.status = body.status
  if (body.priority !== undefined) updates.priority = body.priority
  if (body.assigneeId !== undefined) updates.assigneeId = body.assigneeId
  if (body.tags !== undefined) updates.tags = body.tags
  if (body.estimatedHours !== undefined) updates.estimatedHours = body.estimatedHours
  if (body.actualHours !== undefined) updates.actualHours = body.actualHours
  if (body.dueDate !== undefined) updates.dueDate = body.dueDate ? new Date(body.dueDate) : null
  if (body.position !== undefined) updates.position = body.position

  // Handle status change to completed
  if (updates.status === "completed" && task.status !== "completed") {
    updates.completedAt = new Date()
  } else if (updates.status !== "completed" && task.status === "completed") {
    updates.completedAt = null
  }

  try {
    const updatedTask = db.updateTask(params.id, updates)
    return Response.json(ApiResponseBuilder.success(updatedTask, "Task updated successfully"))
  } catch (error) {
    console.error("Task update error:", error)
    return Response.json(ApiResponseBuilder.error(error instanceof Error ? error.message : "Failed to update task"), {
      status: 500,
    })
  }
})

export const DELETE = withAuth(async (userId: string, request: NextRequest, { params }: { params: { id: string } }) => {
  const task = db.getTaskById(params.id)

  if (!task) {
    return Response.json(ApiResponseBuilder.error("Task not found"), { status: 404 })
  }

  // Check project access and permissions
  const project = db.getProjectById(task.projectId)
  if (!project) {
    return Response.json(ApiResponseBuilder.error("Project not found"), { status: 404 })
  }

  // Only project owner or task creator can delete
  const canDelete = project.ownerId === userId || task.creatorId === userId
  if (!canDelete) {
    return Response.json(ApiResponseBuilder.error("Permission denied"), { status: 403 })
  }

  try {
    db.deleteTask(params.id)
    return Response.json(ApiResponseBuilder.success(null, "Task deleted successfully"))
  } catch (error) {
    console.error("Task deletion error:", error)
    return Response.json(ApiResponseBuilder.error("Failed to delete task"), { status: 500 })
  }
})
