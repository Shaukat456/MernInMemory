import type { NextRequest } from "next/server"
import { AuthService } from "@/lib/auth/auth-utils"
import { ApiResponseBuilder } from "@/lib/api/response-utils"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, username, firstName, lastName, password } = body

    // Comprehensive validation
    const errors: string[] = []

    if (!email) errors.push("Email is required")
    else if (!email.includes("@")) errors.push("Invalid email format")

    if (!username) errors.push("Username is required")
    else if (username.length < 3) errors.push("Username must be at least 3 characters")

    if (!firstName) errors.push("First name is required")
    if (!lastName) errors.push("Last name is required")

    if (!password) errors.push("Password is required")
    else if (password.length < 6) errors.push("Password must be at least 6 characters")

    if (errors.length > 0) {
      return Response.json(ApiResponseBuilder.error(errors.join(", ")), { status: 400 })
    }

    const result = await AuthService.register({
      email,
      username,
      firstName,
      lastName,
      password,
    })

    if (!result.success) {
      return Response.json(ApiResponseBuilder.error(result.error || "Registration failed"), { status: 400 })
    }

    // Set session cookie
    const response = Response.json(
      ApiResponseBuilder.success(
        {
          user: result.user,
          sessionId: result.sessionId,
        },
        "Registration successful",
      ),
    )

    response.headers.set("Set-Cookie", `session=${result.sessionId}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`)

    return response
  } catch (error) {
    console.error("Registration error:", error)
    return Response.json(ApiResponseBuilder.error("Internal server error"), { status: 500 })
  }
}
