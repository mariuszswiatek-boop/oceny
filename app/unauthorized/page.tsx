import Link from "next/link"

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">403</h1>
        <p className="mt-4 text-lg text-gray-600">
          Nie masz uprawnień do tej strony.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Powrót do dashboardu
        </Link>
      </div>
    </div>
  )
}
