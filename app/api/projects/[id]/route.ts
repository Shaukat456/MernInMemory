import type { NextRequest } from "next/server"
import { db } from "@/lib/database/memory-db"
import { ApiResponseBuilder, withAuth } from "@/lib/api/response-utils"

export const GET = withAuth(async (userId: string, request: NextRequest, { params }: { params: { id: string } }) => {
  const project = db.getProjectById(params.id)

  if (!project) {
    return Response.json(ApiResponseBuilder.error("Project not found"), { status: 404 })
  }

  // Check if user has access to this project
  const hasAccess = project.ownerId === userId || project.memberIds.includes(userId)
  if (!hasAccess) {
    return Response.json(ApiResponseBuilder.error("Access denied"), { status: 403 })
  }

  // Enrich with additional data
  const owner = db.getUserById(project.ownerId)
  const members = project.memberIds.map((id) => db.getUserById(id)).filter(Boolean)
  const tasks = db.getTasksByProject(project.id)
  const activities = db.getActivitiesByProject(project.id, 20)

  const enrichedProject = {
    ...project,
    owner: owner
      ? {
          id: owner.id,
          firstName: owner.firstName,
          lastName: owner.lastName,
          avatar: owner.avatar,
        }
      : null,
    members: members.map((member) => ({
      id: member!.id,
      firstName: member!.firstName,
      lastName: member!.lastName,
      avatar: member!.avatar,
      role: member!.role,
    })),
    taskCounts: {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === "completed").length,
      inProgress: tasks.filter((t) => t.status === "in-progress").length,
      review: tasks.filter((t) => t.status === "review").length,
      todo: tasks.filter((t) => t.status === "todo").length,
    },
    recentActivities: activities.map((activity) => ({
      ...activity,
      user: db.getUserById(activity.userId),
    })),
  }

  return Response.json(ApiResponseBuilder.success(enrichedProject, "Project retrieved successfully"))
})

export const PUT = withAuth(async (userId: string, request: NextRequest, { params }: { params: { id: string } }) => {
  const project = db.getProjectById(params.id)

  if (!project) {
    return Response.json(ApiResponseBuilder.error("Project not found"), { status: 404 })
  }

  // Only owner can update project
  if (project.ownerId !== userId) {
    return Response.json(ApiResponseBuilder.error("Only project owner can update project"), { status: 403 })
  }

  const body = await request.json()
  const { name, description, memberIds, status, priority, endDate, settings } = body

  const updates: any = {}
  if (name !== undefined) updates.name = name.trim()
  if (description !== undefined) updates.description = description.trim()
  if (memberIds !== undefined) updates.memberIds = memberIds
  if (status !== undefined) updates.status = status
  if (priority !== undefined) updates.priority = priority
  if (endDate !== undefined) updates.endDate = endDate ? new Date(endDate) : null
  if (settings !== undefined) updates.settings = { ...project.settings, ...settings }

  // Validation
  if (updates.name && updates.name.length === 0) {
    return Response.json(ApiResponseBuilder.error("Project name cannot be empty"), { status: 400 })
  }

  try {
    const updatedProject = db.updateProject(params.id, updates)
    return Response.json(ApiResponseBuilder.success(updatedProject, "Project updated successfully"))
  } catch (error) {
    console.error("Project update error:", error)
    return Response.json(ApiResponseBuilder.error("Failed to update project"), { status: 500 })
  }
})

export const DELETE = withAuth(async (userId: string, request: NextRequest, { params }: { params: { id: string } }) => {
  const project = db.getProjectById(params.id)

  if (!project) {
    return Response.json(ApiResponseBuilder.error("Project not found"), { status: 404 })
  }

  // Only owner can delete project
  if (project.ownerId !== userId) {
    return Response.json(ApiResponseBuilder.error("Only project owner can delete project"), { status: 403 })
  }

  try {
    db.deleteProject(params.id)
    return Response.json(ApiResponseBuilder.success(null, "Project deleted successfully"))
  } catch (error) {
    console.error("Project deletion error:", error)
    return Response.json(ApiResponseBuilder.error("Failed to delete project"), { status: 500 })
  }
})
