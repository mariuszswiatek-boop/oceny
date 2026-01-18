import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Skala ocen Montessori
  const gradeScales = await Promise.all([
    prisma.montessoriGradeScale.upsert({
      where: { label: "NIE/SŁABO OPANOWAŁ" },
      update: { colorHex: "#FF0000", sortOrder: 1, isActive: true },
      create: {
        label: "NIE/SŁABO OPANOWAŁ",
        colorHex: "#FF0000", // czerwony
        sortOrder: 1,
        isActive: true,
      },
    }),
    prisma.montessoriGradeScale.upsert({
      where: { label: "ŚREDNIO OPANOWAŁ" },
      update: { colorHex: "#FFFF00", sortOrder: 2, isActive: true },
      create: {
        label: "ŚREDNIO OPANOWAŁ",
        colorHex: "#FFFF00", // żółty
        sortOrder: 2,
        isActive: true,
      },
    }),
    prisma.montessoriGradeScale.upsert({
      where: { label: "DOBRZE OPANOWAŁ" },
      update: { colorHex: "#90EE90", sortOrder: 3, isActive: true },
      create: {
        label: "DOBRZE OPANOWAŁ",
        colorHex: "#90EE90", // zielony jasny
        sortOrder: 3,
        isActive: true,
      },
    }),
    prisma.montessoriGradeScale.upsert({
      where: { label: "DOSKONALE OPANOWAŁ" },
      update: { colorHex: "#006400", sortOrder: 4, isActive: true },
      create: {
        label: "DOSKONALE OPANOWAŁ",
        colorHex: "#006400", // zielony mocny
        sortOrder: 4,
        isActive: true,
      },
    }),
  ])

  console.log("Created grade scales")

  // Przedmioty
  const subjectSeeds = [
    "Język polski",
    "Język angielski",
    "Język hiszpański",
    "Muzyka",
    "Plastyka",
    "Historia",
    "Przyroda / Biologia",
    "Geografia",
    "Chemia",
    "Fizyka",
    "Matematyka",
    "Informatyka",
    "Technika",
    "Wychowanie fizyczne",
  ]
  const subjects = await Promise.all(
    subjectSeeds.map((name, idx) =>
      prisma.subject.upsert({
        where: { name },
        update: { sortOrder: idx + 1, isActive: true },
        create: { name, sortOrder: idx + 1, isActive: true },
      })
    )
  )

  console.log("Created subjects")

  // Rok szkolny
  const schoolYear = await prisma.schoolYear.upsert({
    where: { name: "2025/2026" },
    update: { isActive: true, sortOrder: 1, gradingTerm: "MIDYEAR", isGradingOpen: true },
    create: {
      name: "2025/2026",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-06-30"),
      isActive: true,
      gradingTerm: "MIDYEAR",
      isGradingOpen: true,
      sortOrder: 1,
    },
  })

  console.log("Created school year")

  // Użytkownicy
  const hashedPassword = await bcrypt.hash("password123", 10)

  const admin = await prisma.user.upsert({
    where: { email: "admin@szkola.pl" },
    update: { role: "ADMIN", isActive: true },
    create: {
      email: "admin@szkola.pl",
      password: hashedPassword,
      firstName: "Jan",
      lastName: "Admin",
      role: "ADMIN",
      isActive: true,
    },
  })

  const wychowawca = await prisma.user.upsert({
    where: { email: "wychowawca@szkola.pl" },
    update: { role: "HOMEROOM", isActive: true },
    create: {
      email: "wychowawca@szkola.pl",
      password: hashedPassword,
      firstName: "Anna",
      lastName: "Wychowawczyni",
      role: "HOMEROOM",
      isActive: true,
    },
  })

  const nauczyciel1 = await prisma.user.upsert({
    where: { email: "nauczyciel1@szkola.pl" },
    update: { role: "TEACHER", isActive: true },
    create: {
      email: "nauczyciel1@szkola.pl",
      password: hashedPassword,
      firstName: "Piotr",
      lastName: "Nauczyciel",
      role: "TEACHER",
      isActive: true,
    },
  })

  const nauczyciel2 = await prisma.user.upsert({
    where: { email: "nauczyciel2@szkola.pl" },
    update: { role: "TEACHER", isActive: true },
    create: {
      email: "nauczyciel2@szkola.pl",
      password: hashedPassword,
      firstName: "Maria",
      lastName: "Nauczycielka",
      role: "TEACHER",
      isActive: true,
    },
  })

  console.log("Created users")

  // Klasa
  const class_ = await prisma.class.upsert({
    where: { id: "class-2a" },
    update: { isActive: true, sortOrder: 1, teacherId: wychowawca.id },
    create: {
      id: "class-2a",
      name: "2A",
      schoolYearId: schoolYear.id,
      teacherId: wychowawca.id,
      sortOrder: 1,
      isActive: true,
    },
  })

  console.log("Created class")

  // Uczniowie
  const student1 = await prisma.student.create({
    data: {
      firstName: "Jan",
      lastName: "Kowalski",
      classId: class_.id,
      isActive: true,
    },
  })

  const student2 = await prisma.student.create({
    data: {
      firstName: "Anna",
      lastName: "Nowak",
      classId: class_.id,
      isActive: true,
    },
  })

  const student3 = await prisma.student.create({
    data: {
      firstName: "Piotr",
      lastName: "Wiśniewski",
      classId: class_.id,
      isActive: true,
    },
  })

  console.log("Created students")

  // Rodzice
  await prisma.parentContact.createMany({
    data: [
      {
        studentId: student1.id,
        email: "rodzic1@example.com",
        fullName: "Tomasz Kowalski",
        phone: "+48 600 111 111",
        isPrimary: true,
      },
      {
        studentId: student2.id,
        email: "rodzic2@example.com",
        fullName: "Ewa Nowak",
        phone: "+48 600 222 222",
        isPrimary: true,
      },
      {
        studentId: student3.id,
        email: "rodzic3@example.com",
        fullName: "Marek Wiśniewski",
        phone: "+48 600 333 333",
        isPrimary: true,
      },
    ],
    skipDuplicates: true,
  })

  console.log("Created parent contacts")

  // Przypisania nauczycieli
  await prisma.teacherAssignment.createMany({
    data: [
      {
        teacherId: nauczyciel1.id,
        subjectId: subjects.find((s) => s.name === "Język polski")!.id,
        classId: class_.id,
        schoolYearId: schoolYear.id,
      },
      {
        teacherId: nauczyciel1.id,
        subjectId: subjects.find((s) => s.name === "Historia")!.id,
        classId: class_.id,
        schoolYearId: schoolYear.id,
      },
      {
        teacherId: nauczyciel2.id,
        subjectId: subjects.find((s) => s.name === "Matematyka")!.id,
        classId: class_.id,
        schoolYearId: schoolYear.id,
      },
      {
        teacherId: nauczyciel2.id,
        subjectId: subjects.find((s) => s.name === "Przyroda / Biologia")!.id,
        classId: class_.id,
        schoolYearId: schoolYear.id,
      },
    ],
    skipDuplicates: true,
  })

  console.log("Created teacher assignments")

  // Przykładowe oceny
  const gradeScaleIds = gradeScales.map((gs) => gs.id)
  await prisma.studentGrade.createMany({
    data: [
      {
        studentId: student1.id,
        subjectId: subjects.find((s) => s.name === "Język polski")!.id,
        schoolYearId: schoolYear.id,
        term: "MIDYEAR",
        gradeScaleId: gradeScaleIds[2], // DOBRZE OPANOWAŁ
        teacherId: nauczyciel1.id,
      },
      {
        studentId: student1.id,
        subjectId: subjects.find((s) => s.name === "Matematyka")!.id,
        schoolYearId: schoolYear.id,
        term: "MIDYEAR",
        gradeScaleId: gradeScaleIds[3], // DOSKONALE OPANOWAŁ
        teacherId: nauczyciel2.id,
      },
      {
        studentId: student2.id,
        subjectId: subjects.find((s) => s.name === "Język polski")!.id,
        schoolYearId: schoolYear.id,
        term: "MIDYEAR",
        gradeScaleId: gradeScaleIds[1], // ŚREDNIO OPANOWAŁ
        teacherId: nauczyciel1.id,
      },
      {
        studentId: student1.id,
        subjectId: subjects.find((s) => s.name === "Język polski")!.id,
        schoolYearId: schoolYear.id,
        term: "FINAL",
        gradeScaleId: gradeScaleIds[3], // DOSKONALE OPANOWAŁ
        teacherId: nauczyciel1.id,
      },
      {
        studentId: student2.id,
        subjectId: subjects.find((s) => s.name === "Matematyka")!.id,
        schoolYearId: schoolYear.id,
        term: "FINAL",
        gradeScaleId: gradeScaleIds[2], // DOBRZE OPANOWAŁ
        teacherId: nauczyciel2.id,
      },
    ],
    skipDuplicates: true,
  })

  console.log("Created sample grades")
  console.log("Seeding completed!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
