import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const secret =
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV !== "production" ? "dev-secret" : undefined)

  const token = await getToken({ req: request, secret })
  const path = request.nextUrl.pathname

  // Jeśli nie ma tokenu, przekieruj do logowania
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Sprawdź uprawnienia do różnych ścieżek
  if (path.startsWith("/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", request.url))
  }

  if (path.startsWith("/nauczyciel") && token.role !== "TEACHER") {
    return NextResponse.redirect(new URL("/unauthorized", request.url))
  }

  if (path.startsWith("/wychowawca") && token.role !== "HOMEROOM") {
    return NextResponse.redirect(new URL("/unauthorized", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/nauczyciel/:path*",
    "/wychowawca/:path*",
    "/dashboard/:path*",
  ],
}
