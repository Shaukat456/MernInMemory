import type { NextRequest } from "next/server"
import { db } from "@/lib/database/memory-db"
import { ApiResponseBuilder, withAuth } from "@/lib/api/response-utils"

export const GET = withAuth(async (userId: string, request: NextRequest) => {
  const url = new URL(request.url)
  const search = url.searchParams.get("search") || ""
  const limit = Number.parseInt(url.searchParams.get("limit") || "10")
  const page = Number.parseInt(url.searchParams.get("page") || "1")

  // Get all users (in a real app, you'd implement proper pagination)
  const allUsers = Array.from(db["users"].values())

  // Filter by search term
  let filteredUsers = allUsers
  if (search) {
    const searchLower = search.toLowerCase()
    filteredUsers = allUsers.filter(
      (user) =>
        user.firstName.toLowerCase().includes(searchLower) ||
        user.lastName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.username.toLowerCase().includes(searchLower),
    )
  }

  // Pagination
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  // Remove sensitive information
  const safeUsers = paginatedUsers.map((user) => ({
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    role: user.role,
    lastActive: user.lastActive,
  }))

  return Response.json(ApiResponseBuilder.paginated(safeUsers, filteredUsers.length, page, limit))
})
