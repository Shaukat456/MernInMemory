import type { NextRequest } from "next/server"
import { db } from "@/lib/database/memory-db"
import { ApiResponseBuilder, withAuth } from "@/lib/api/response-utils"

export const GET = withAuth(async (userId: string) => {
  const user = db.getUserById(userId)

  if (!user) {
    return Response.json(ApiResponseBuilder.error("User not found"), { status: 404 })
  }

  return Response.json(ApiResponseBuilder.success(user, "User profile retrieved"))
})

export const PUT = withAuth(async (userId: string, request: NextRequest) => {
  const body = await request.json()
  const { firstName, lastName, preferences } = body

  const updates: any = {}
  if (firstName) updates.firstName = firstName
  if (lastName) updates.lastName = lastName
  if (preferences) updates.preferences = { ...preferences }

  const updatedUser = db.updateUser(userId, updates)

  if (!updatedUser) {
    return Response.json(ApiResponseBuilder.error("User not found"), { status: 404 })
  }

  return Response.json(ApiResponseBuilder.success(updatedUser, "Profile updated successfully"))
})
