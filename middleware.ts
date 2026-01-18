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

  const role = session.user.role

  // Sprawdź uprawnienia do różnych ścieżek
  if (path.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", request.url))
  }

  if (path.startsWith("/nauczyciel") && role !== "TEACHER") {
    return NextResponse.redirect(new URL("/unauthorized", request.url))
  }

  if (path.startsWith("/wychowawca") && role !== "HOMEROOM") {
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
