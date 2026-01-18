import { redirect } from "next/navigation"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  const roles = session.user.roles ?? []

  if (roles.length === 1) {
    if (roles.includes("ADMIN")) redirect("/admin")
    if (roles.includes("TEACHER")) redirect("/nauczyciel")
    if (roles.includes("HOMEROOM")) redirect("/wychowawca")
  }

  const panels = [
    roles.includes("ADMIN") && { href: "/admin", label: "Panel administratora" },
    roles.includes("TEACHER") && { href: "/nauczyciel", label: "Panel nauczyciela" },
    roles.includes("HOMEROOM") && { href: "/wychowawca", label: "Panel wychowawcy" },
  ].filter(Boolean) as { href: string; label: string }[]

  if (panels.length === 0) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900">Wybierz panel</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {panels.map((panel) => (
            <Link
              key={panel.href}
              href={panel.href}
              className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg"
            >
              <div className="text-lg font-semibold text-gray-900">{panel.label}</div>
              <div className="mt-2 text-sm text-gray-600">Przejdź do panelu</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
