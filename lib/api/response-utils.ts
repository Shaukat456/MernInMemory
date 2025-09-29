// Standardized API response utilities

import { db } from "../database/memory-db" // Assuming db is imported from another module

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  meta?: {
    total?: number
    page?: number
    limit?: number
    hasMore?: boolean
  }
}

export class ApiResponseBuilder {
  static success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
    }
  }

  static error(error: string, statusCode?: number): ApiResponse {
    return {
      success: false,
      error,
    }
  }

  static paginated<T>(data: T[], total: number, page: number, limit: number): ApiResponse<T[]> {
    return {
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        hasMore: page * limit < total,
      },
    }
  }
}

export function withAuth<T extends any[]>(handler: (userId: string, ...args: T) => any) {
  return async (request: Request, ...args: T) => {
    const sessionId = request.headers.get("Authorization")?.replace("Bearer ", "")

    if (!sessionId) {
      return Response.json(ApiResponseBuilder.error("Authentication required"), { status: 401 })
    }

    const userId = db.validateSession(sessionId)
    if (!userId) {
      return Response.json(ApiResponseBuilder.error("Invalid or expired session"), { status: 401 })
    }

    try {
      return await handler(userId, ...args)
    } catch (error) {
      console.error("API Error:", error)
      return Response.json(ApiResponseBuilder.error("Internal server error"), { status: 500 })
    }
  }
}
