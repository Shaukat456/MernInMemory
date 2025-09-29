import type { NextRequest } from "next/server"
import { AuthService } from "@/lib/auth/auth-utils"
import { ApiResponseBuilder } from "@/lib/api/response-utils"

export async function POST(request: NextRequest) {
  try {
    const sessionId =
      request.headers.get("Authorization")?.replace("Bearer ", "") || request.cookies.get("session")?.value

    if (sessionId) {
      AuthService.logout(sessionId)
    }

    const response = Response.json(ApiResponseBuilder.success(null, "Logged out successfully"))

    // Clear session cookie
    response.headers.set("Set-Cookie", "session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict")

    return response
  } catch (error) {
    console.error("Logout error:", error)
    return Response.json(ApiResponseBuilder.error("Internal server error"), { status: 500 })
  }
}
