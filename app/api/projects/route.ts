import type { NextRequest } from "next/server"
import { db } from "@/lib/database/memory-db"
import { ApiResponseBuilder, withAuth } from "@/lib/api/response-utils"

export const GET = withAuth(async (userId: string, request: NextRequest) => {
  const url = new URL(request.url)
  const status = url.searchParams.get("status")
  const search = url.searchParams.get("search") || ""

  let projects = db.getProjectsByUser(userId)

  // Filter by status
  if (status && status !== "all") {
    projects = projects.filter((project) => project.status === status)
  }

  // Filter by search term
  if (search) {
    const searchLower = search.toLowerCase()
    projects = projects.filter(
      (project) =>
        project.name.toLowerCase().includes(searchLower) || project.description.toLowerCase().includes(searchLower),
    )
  }

  // Add member information and task counts
  const enrichedProjects = projects.map((project) => {
    const members = project.memberIds.map((id) => db.getUserById(id)).filter(Boolean)
    const owner = db.getUserById(project.ownerId)
    const tasks = db.getTasksByProject(project.id)

    return {
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
      })),
      taskCounts: {
        total: tasks.length,
        completed: tasks.filter((t) => t.status === "completed").length,
        inProgress: tasks.filter((t) => t.status === "in-progress").length,
        todo: tasks.filter((t) => t.status === "todo").length,
      },
    }
  })

  return Response.json(ApiResponseBuilder.success(enrichedProjects, "Projects retrieved successfully"))
})

export const POST = withAuth(async (userId: string, request: NextRequest) => {
  const body = await request.json()
  const { name, description, memberIds = [], priority = "medium", startDate, endDate } = body

  // Validation
  if (!name || name.trim().length === 0) {
    return Response.json(ApiResponseBuilder.error("Project name is required"), { status: 400 })
  }

  if (name.length > 100) {
    return Response.json(ApiResponseBuilder.error("Project name must be less than 100 characters"), { status: 400 })
  }

  // Validate member IDs
  const validMemberIds = []
  for (const memberId of memberIds) {
    const member = db.getUserById(memberId)
    if (member) {
      validMemberIds.push(memberId)
    }
  }

  try {
    const project = db.createProject({
      name: name.trim(),
      description: description?.trim() || "",
      ownerId: userId,
      memberIds: validMemberIds,
      status: "active",
      priority,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : undefined,
      settings: {
        isPublic: false,
        allowGuestAccess: false,
        autoArchive: false,
      },
    })

    return Response.json(ApiResponseBuilder.success(project, "Project created successfully"), { status: 201 })
  } catch (error) {
    console.error("Project creation error:", error)
    return Response.json(ApiResponseBuilder.error("Failed to create project"), { status: 500 })
  }
})
