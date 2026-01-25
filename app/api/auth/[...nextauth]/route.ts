import NextAuth from "next-auth"
import type { NextRequest } from "next/server"
import { authOptions } from "@/lib/auth"
import { getRequestMeta, logAuditEvent } from "@/lib/audit"

const handler = NextAuth(authOptions)

export const { auth, handlers } = handler

const { GET: baseGET, POST: basePOST } = handlers
const isAuthDebug = process.env.AUTH_DEBUG === "true"

export const GET = (req: NextRequest) => {
  if (isAuthDebug) {
    console.log("AUTH_DEBUG GET", {
      path: req.nextUrl.pathname,
      host: req.headers.get("host"),
      xfHost: req.headers.get("x-forwarded-host"),
      xfProto: req.headers.get("x-forwarded-proto"),
    })
  }
  return baseGET(req)
}

export const POST = async (req: NextRequest) => {
  if (isAuthDebug) {
    console.log("AUTH_DEBUG POST", {
      path: req.nextUrl.pathname,
      host: req.headers.get("host"),
      xfHost: req.headers.get("x-forwarded-host"),
      xfProto: req.headers.get("x-forwarded-proto"),
    })
  }
  if (req.nextUrl.pathname.includes("/signout")) {
    const meta = getRequestMeta(req)
    await logAuditEvent({
      action: "auth.logout",
      entityType: "auth",
      entityLabel: "signout",
      success: true,
      ...meta,
    })
  }
  return basePOST(req)
}
