import { redirect } from "next/navigation"
import { auth } from "@/app/api/auth/[...nextauth]/route"
export default async function Home() {
  let session;
  try {
    session = await auth()
  } catch (error: any) {
    console.error('AUTH ERROR:', error);
    throw error;
  }

  if (session) {
    redirect("/dashboard")
  } else {
    redirect("/login")
  }
}
