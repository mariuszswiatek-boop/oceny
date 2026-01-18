import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"

export default auth((request: NextRequest & { auth: any }) => {
  const path = request.nextUrl.pathname
  const session = request.auth

  // Jeśli nie ma sesji, przekieruj do logowania
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const roles = session.user.roles ?? []

  // Sprawdź uprawnienia do różnych ścieżek
  if (path.startsWith("/admin") && !roles.includes("ADMIN")) {
    return NextResponse.redirect(new URL("/unauthorized", request.url))
  }

  if (path.startsWith("/nauczyciel") && !roles.includes("TEACHER")) {
    return NextResponse.redirect(new URL("/unauthorized", request.url))
  }

  if (path.startsWith("/wychowawca") && !roles.includes("HOMEROOM")) {
    return NextResponse.redirect(new URL("/unauthorized", request.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/admin/:path*",
    "/nauczyciel/:path*",
    "/wychowawca/:path*",
    "/dashboard/:path*",
  ],
}
