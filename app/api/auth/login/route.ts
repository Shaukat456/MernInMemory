import type { NextRequest } from "next/server"
import { AuthService } from "@/lib/auth/auth-utils"
import { ApiResponseBuilder } from "@/lib/api/response-utils"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validation
    if (!email || !password) {
      return Response.json(ApiResponseBuilder.error("Email and password are required"), { status: 400 })
    }

    if (!email.includes("@")) {
      return Response.json(ApiResponseBuilder.error("Invalid email format"), { status: 400 })
    }

    const result = await AuthService.login(email, password)

    if (!result.success) {
      return Response.json(ApiResponseBuilder.error(result.error || "Login failed"), { status: 401 })
    }

    // Set session cookie
    const response = Response.json(
      ApiResponseBuilder.success(
        {
          user: result.user,
          sessionId: result.sessionId,
        },
        "Login successful",
      ),
    )

    response.headers.set("Set-Cookie", `session=${result.sessionId}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`)

    return response
  } catch (error) {
    console.error("Login error:", error)
    return Response.json(ApiResponseBuilder.error("Internal server error"), { status: 500 })
  }
}
