import type { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"
import { z } from "zod"
import { getRequestMeta, logAuditEvent } from "@/lib/audit"

const isAuthDebug = process.env.AUTH_DEBUG === "true"

export const authOptions: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  trustHost: true,
  debug: process.env.NEXTAUTH_DEBUG === "true",
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        const credentialsSchema = z.object({
          email: z.string().email(),
          password: z.string().min(1),
        })
        const parsedCredentials = credentialsSchema.safeParse(credentials)
        if (!parsedCredentials.success) {
          if (isAuthDebug) {
            console.warn("AUTH_DEBUG invalid credentials payload")
          }
          const meta = req ? getRequestMeta(req) : { ip: null, userAgent: null }
          await logAuditEvent({
            action: "auth.login",
            entityType: "auth",
            entityLabel: "credentials",
            success: false,
            metadata: { reason: "invalid_payload" },
            ...meta,
          })
          return null
        }
        const { email, password } = parsedCredentials.data
        const meta = req ? getRequestMeta(req) : { ip: null, userAgent: null }

        const user = await prisma.user.findUnique({
          where: { email }
        })

        if (!user) {
          if (isAuthDebug) {
            console.warn("AUTH_DEBUG user not found", { email })
          }
          await logAuditEvent({
            action: "auth.login",
            entityType: "user",
            entityId: null,
            entityLabel: email,
            actorEmail: email,
            success: false,
            metadata: { reason: "user_not_found" },
            ...meta,
          })
          return null
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
          if (isAuthDebug) {
            console.warn("AUTH_DEBUG invalid password", { email })
          }
          await logAuditEvent({
            action: "auth.login",
            entityType: "user",
            entityId: user.id,
            entityLabel: email,
            actorId: user.id,
            actorEmail: user.email,
            actorRoles: user.roles,
            success: false,
            metadata: { reason: "invalid_password" },
            ...meta,
          })
          return null
        }

        await logAuditEvent({
          action: "auth.login",
          entityType: "user",
          entityId: user.id,
          entityLabel: `${user.firstName} ${user.lastName}`,
          actorId: user.id,
          actorEmail: user.email,
          actorRoles: user.roles,
          success: true,
          ...meta,
        })
        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          roles: user.roles,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id
        token.roles = (user as any).roles
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.roles = (token.roles as UserRole[]) ?? []
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
}

