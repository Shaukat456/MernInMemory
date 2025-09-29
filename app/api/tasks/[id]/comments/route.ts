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

  // Get comments with user information
  const enrichedComments = task.comments
    .map((comment) => ({
      ...comment,
      user: db.getUserById(comment.userId),
    }))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  return Response.json(ApiResponseBuilder.success(enrichedComments, "Comments retrieved successfully"))
})

export const POST = withAuth(async (userId: string, request: NextRequest, { params }: { params: { id: string } }) => {
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
  const { content } = body

  if (!content || content.trim().length === 0) {
    return Response.json(ApiResponseBuilder.error("Comment content is required"), { status: 400 })
  }

  if (content.length > 2000) {
    return Response.json(ApiResponseBuilder.error("Comment must be less than 2000 characters"), { status: 400 })
  }

  try {
    const comment = db.addComment(params.id, {
      userId,
      content: content.trim(),
      mentions: extractMentions(content),
    })

    // Create notifications for mentions
    const mentions = extractMentions(content)
    for (const mentionedUserId of mentions) {
      if (mentionedUserId !== userId) {
        db.createNotification({
          userId: mentionedUserId,
          type: "mention",
          title: "You were mentioned",
          message: `${db.getUserById(userId)?.firstName} mentioned you in a comment on "${task.title}"`,
          actionUrl: `/projects/${task.projectId}/tasks/${task.id}`,
        })
      }
    }

    const enrichedComment = {
      ...comment,
      user: db.getUserById(userId),
    }

    return Response.json(ApiResponseBuilder.success(enrichedComment, "Comment added successfully"), { status: 201 })
  } catch (error) {
    console.error("Comment creation error:", error)
    return Response.json(ApiResponseBuilder.error("Failed to add comment"), { status: 500 })
  }
})

function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g
  const mentions: string[] = []
  let match

  while ((match = mentionRegex.exec(content)) !== null) {
    const username = match[1]
    const user = db.getUserByUsername(username)
    if (user) {
      mentions.push(user.id)
    }
  }

  return [...new Set(mentions)] // Remove duplicates
}
