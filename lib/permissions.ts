import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "./prisma"
import { UserRole } from "@prisma/client"

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user) {
    return null
  }
  return session.user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}

export async function requireRole(role: UserRole | UserRole[]) {
  const user = await requireAuth()
  const allowedRoles = Array.isArray(role) ? role : [role]
  const userRoles = user.roles ?? []
  if (!allowedRoles.some((allowed) => userRoles.includes(allowed))) {
    throw new Error("Forbidden")
  }
  return user
}

// Sprawdza czy nauczyciel ma dostęp do klasy
export async function canTeacherAccessClass(teacherId: string, classId: string) {
  const assignment = await prisma.teacherAssignment.findFirst({
    where: {
      teacherId,
      classId,
    },
  })
  return !!assignment
}

// Sprawdza czy nauczyciel ma dostęp do przedmiotu w klasie
export async function canTeacherAccessSubjectClass(
  teacherId: string,
  subjectId: string,
  classId: string
) {
  const assignment = await prisma.teacherAssignment.findFirst({
    where: {
      teacherId,
      subjectId,
      classId,
    },
  })
  return !!assignment
}

// Sprawdza czy wychowawca ma dostęp do klasy
export async function canTeacherAccessClassAsHomeroom(teacherId: string, classId: string) {
    const class_ = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId,
      },
    })
  return !!class_
}

// Sprawdza czy uczeń należy do klasy
export async function isStudentInClass(studentId: string, classId: string) {
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      classId,
    },
  })
  return !!student
}
