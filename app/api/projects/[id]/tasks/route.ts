import type { NextRequest } from "next/server"
import { db } from "@/lib/database/memory-db"
import { ApiResponseBuilder, withAuth } from "@/lib/api/response-utils"

export const GET = withAuth(async (userId: string, request: NextRequest, { params }: { params: { id: string } }) => {
  const project = db.getProjectById(params.id)

  if (!project) {
    return Response.json(ApiResponseBuilder.error("Project not found"), { status: 404 })
  }

  // Check access
  const hasAccess = project.ownerId === userId || project.memberIds.includes(userId)
  if (!hasAccess) {
    return Response.json(ApiResponseBuilder.error("Access denied"), { status: 403 })
  }

  const url = new URL(request.url)
  const status = url.searchParams.get("status")
  const assigneeId = url.searchParams.get("assigneeId")
  const priority = url.searchParams.get("priority")
  const tags = url.searchParams.get("tags")?.split(",").filter(Boolean)

  const filters: any = {}
  if (status) filters.status = status
  if (assigneeId) filters.assigneeId = assigneeId
  if (priority) filters.priority = priority
  if (tags && tags.length > 0) filters.tags = tags

  const tasks = db.getTasksByProject(params.id, filters)

  // Enrich tasks with user information and dependency details
  const enrichedTasks = tasks.map((task) => {
    const assignee = task.assigneeId ? db.getUserById(task.assigneeId) : null
    const creator = db.getUserById(task.creatorId)

    // Get dependency information
    const dependencies = task.dependsOn
      .map((depId) => {
        const depTask = db.getTaskById(depId)
        return depTask
          ? {
              id: depTask.id,
              title: depTask.title,
              status: depTask.status,
            }
          : null
      })
      .filter(Boolean)

    const blockers = task.blockedBy
      .map((blockerId) => {
        const blockerTask = db.getTaskById(blockerId)
        return blockerTask
          ? {
              id: blockerTask.id,
              title: blockerTask.title,
              status: blockerTask.status,
            }
          : null
      })
      .filter(Boolean)

    return {
      ...task,
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
      dependencies,
      blockers,
      commentCount: task.comments.length,
      attachmentCount: task.attachments.length,
    }
  })

  return Response.json(ApiResponseBuilder.success(enrichedTasks, "Tasks retrieved successfully"))
})

export const POST = withAuth(async (userId: string, request: NextRequest, { params }: { params: { id: string } }) => {
  const project = db.getProjectById(params.id)

  if (!project) {
    return Response.json(ApiResponseBuilder.error("Project not found"), { status: 404 })
  }

  // Check access
  const hasAccess = project.ownerId === userId || project.memberIds.includes(userId)
  if (!hasAccess) {
    return Response.json(ApiResponseBuilder.error("Access denied"), { status: 403 })
  }

  const body = await request.json()
  const {
    title,
    description = "",
    assigneeId,
    priority = "medium",
    tags = [],
    dependsOn = [],
    estimatedHours,
    dueDate,
  } = body

  // Validation
  if (!title || title.trim().length === 0) {
    return Response.json(ApiResponseBuilder.error("Task title is required"), { status: 400 })
  }

  if (title.length > 200) {
    return Response.json(ApiResponseBuilder.error("Task title must be less than 200 characters"), { status: 400 })
  }

  // Validate assignee
  if (assigneeId) {
    const assignee = db.getUserById(assigneeId)
    if (!assignee) {
      return Response.json(ApiResponseBuilder.error("Invalid assignee"), { status: 400 })
    }

    // Check if assignee has access to project
    const assigneeHasAccess = project.ownerId === assigneeId || project.memberIds.includes(assigneeId)
    if (!assigneeHasAccess) {
      return Response.json(ApiResponseBuilder.error("Assignee must be a project member"), { status: 400 })
    }
  }

  // Validate dependencies
  for (const depId of dependsOn) {
    const depTask = db.getTaskById(depId)
    if (!depTask || depTask.projectId !== params.id) {
      return Response.json(ApiResponseBuilder.error("Invalid task dependency"), { status: 400 })
    }
  }

  try {
    // Get next position
    const existingTasks = db.getTasksByProject(params.id)
    const maxPosition = Math.max(0, ...existingTasks.map((t) => t.position))

    const task = db.createTask({
      title: title.trim(),
      description: description.trim(),
      projectId: params.id,
      assigneeId: assigneeId || undefined,
      creatorId: userId,
      status: "todo",
      priority,
      tags: Array.isArray(tags) ? tags : [],
      dependsOn: Array.isArray(dependsOn) ? dependsOn : [],
      blockedBy: [],
      estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      position: maxPosition + 1,
    })

    return Response.json(ApiResponseBuilder.success(task, "Task created successfully"), { status: 201 })
  } catch (error) {
    console.error("Task creation error:", error)
    return Response.json(ApiResponseBuilder.error(error instanceof Error ? error.message : "Failed to create task"), {
      status: 500,
    })
  }
})
