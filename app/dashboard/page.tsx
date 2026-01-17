import { redirect } from "next/navigation"
import { auth } from "@/app/api/auth/[...nextauth]/route"

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  const role = session.user.role

  if (role === "ADMIN") {
    redirect("/admin")
  } else if (role === "TEACHER") {
    redirect("/nauczyciel")
  } else if (role === "HOMEROOM") {
    redirect("/wychowawca")
  } else {
    redirect("/login")
  }
}
