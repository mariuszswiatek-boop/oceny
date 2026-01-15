import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Skala ocen Montessori
  const gradeScales = await Promise.all([
    prisma.montessoriGradeScale.upsert({
      where: { label: "NIE/SŁABO OPANOWAŁ" },
      update: {},
      create: {
        label: "NIE/SŁABO OPANOWAŁ",
        colorHex: "#FF0000", // czerwony
        sortOrder: 1,
      },
    }),
    prisma.montessoriGradeScale.upsert({
      where: { label: "ŚREDNIO OPANOWAŁ" },
      update: {},
      create: {
        label: "ŚREDNIO OPANOWAŁ",
        colorHex: "#FFFF00", // żółty
        sortOrder: 2,
      },
    }),
    prisma.montessoriGradeScale.upsert({
      where: { label: "DOBRZE OPANOWAŁ" },
      update: {},
      create: {
        label: "DOBRZE OPANOWAŁ",
        colorHex: "#90EE90", // zielony jasny
        sortOrder: 3,
      },
    }),
    prisma.montessoriGradeScale.upsert({
      where: { label: "DOSKONALE OPANOWAŁ" },
      update: {},
      create: {
        label: "DOSKONALE OPANOWAŁ",
        colorHex: "#006400", // zielony mocny
        sortOrder: 4,
      },
    }),
  ])

  console.log("Created grade scales")

  // Przedmioty
  const subjects = await Promise.all([
    prisma.subject.upsert({
      where: { name: "Język polski" },
      update: {},
      create: { name: "Język polski" },
    }),
    prisma.subject.upsert({
      where: { name: "Język angielski" },
      update: {},
      create: { name: "Język angielski" },
    }),
    prisma.subject.upsert({
      where: { name: "Język hiszpański" },
      update: {},
      create: { name: "Język hiszpański" },
    }),
    prisma.subject.upsert({
      where: { name: "Matematyka" },
      update: {},
      create: { name: "Matematyka" },
    }),
    prisma.subject.upsert({
      where: { name: "Historia" },
      update: {},
      create: { name: "Historia" },
    }),
    prisma.subject.upsert({
      where: { name: "Przyroda/Biologia" },
      update: {},
      create: { name: "Przyroda/Biologia" },
    }),
    prisma.subject.upsert({
      where: { name: "Geografia" },
      update: {},
      create: { name: "Geografia" },
    }),
    prisma.subject.upsert({
      where: { name: "Chemia" },
      update: {},
      create: { name: "Chemia" },
    }),
    prisma.subject.upsert({
      where: { name: "Fizyka" },
      update: {},
      create: { name: "Fizyka" },
    }),
    prisma.subject.upsert({
      where: { name: "Informatyka" },
      update: {},
      create: { name: "Informatyka" },
    }),
    prisma.subject.upsert({
      where: { name: "Technika" },
      update: {},
      create: { name: "Technika" },
    }),
    prisma.subject.upsert({
      where: { name: "Muzyka" },
      update: {},
      create: { name: "Muzyka" },
    }),
    prisma.subject.upsert({
      where: { name: "Plastyka" },
      update: {},
      create: { name: "Plastyka" },
    }),
    prisma.subject.upsert({
      where: { name: "WF" },
      update: {},
      create: { name: "WF" },
    }),
  ])

  console.log("Created subjects")

  // Rok szkolny
  const schoolYear = await prisma.schoolYear.upsert({
    where: { name: "2023/2024" },
    update: {},
    create: {
      name: "2023/2024",
      startDate: new Date("2023-09-01"),
      endDate: new Date("2024-06-30"),
      isActive: true,
    },
  })

  console.log("Created school year")

  // Użytkownicy
  const hashedPassword = await bcrypt.hash("password123", 10)

  const admin = await prisma.user.upsert({
    where: { email: "admin@szkola.pl" },
    update: {},
    create: {
      email: "admin@szkola.pl",
      password: hashedPassword,
      firstName: "Jan",
      lastName: "Admin",
      role: "ADMIN",
    },
  })

  const wychowawca = await prisma.user.upsert({
    where: { email: "wychowawca@szkola.pl" },
    update: {},
    create: {
      email: "wychowawca@szkola.pl",
      password: hashedPassword,
      firstName: "Anna",
      lastName: "Wychowawczyni",
      role: "WYCHOWAWCA",
    },
  })

  const nauczyciel1 = await prisma.user.upsert({
    where: { email: "nauczyciel1@szkola.pl" },
    update: {},
    create: {
      email: "nauczyciel1@szkola.pl",
      password: hashedPassword,
      firstName: "Piotr",
      lastName: "Nauczyciel",
      role: "NAUCZYCIEL",
    },
  })

  const nauczyciel2 = await prisma.user.upsert({
    where: { email: "nauczyciel2@szkola.pl" },
    update: {},
    create: {
      email: "nauczyciel2@szkola.pl",
      password: hashedPassword,
      firstName: "Maria",
      lastName: "Nauczycielka",
      role: "NAUCZYCIEL",
    },
  })

  console.log("Created users")

  // Klasa
  const class_ = await prisma.class.upsert({
    where: { id: "class-2a" },
    update: {},
    create: {
      id: "class-2a",
      name: "2A",
      schoolYearId: schoolYear.id,
      teacherId: wychowawca.id,
    },
  })

  console.log("Created class")

  // Uczniowie
  const student1 = await prisma.student.create({
    data: {
      firstName: "Jan",
      lastName: "Kowalski",
      classId: class_.id,
    },
  })

  const student2 = await prisma.student.create({
    data: {
      firstName: "Anna",
      lastName: "Nowak",
      classId: class_.id,
    },
  })

  const student3 = await prisma.student.create({
    data: {
      firstName: "Piotr",
      lastName: "Wiśniewski",
      classId: class_.id,
    },
  })

  console.log("Created students")

  // Rodzice
  await prisma.parentContact.createMany({
    data: [
      {
        studentId: student1.id,
        email: "rodzic1@example.com",
        firstName: "Tomasz",
        lastName: "Kowalski",
      },
      {
        studentId: student2.id,
        email: "rodzic2@example.com",
        firstName: "Ewa",
        lastName: "Nowak",
      },
      {
        studentId: student3.id,
        email: "rodzic3@example.com",
        firstName: "Marek",
        lastName: "Wiśniewski",
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
      },
      {
        teacherId: nauczyciel1.id,
        subjectId: subjects.find((s) => s.name === "Historia")!.id,
        classId: class_.id,
      },
      {
        teacherId: nauczyciel2.id,
        subjectId: subjects.find((s) => s.name === "Matematyka")!.id,
        classId: class_.id,
      },
      {
        teacherId: nauczyciel2.id,
        subjectId: subjects.find((s) => s.name === "Przyroda/Biologia")!.id,
        classId: class_.id,
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
        gradeScaleId: gradeScaleIds[2], // DOBRZE OPANOWAŁ
        teacherId: nauczyciel1.id,
      },
      {
        studentId: student1.id,
        subjectId: subjects.find((s) => s.name === "Matematyka")!.id,
        schoolYearId: schoolYear.id,
        gradeScaleId: gradeScaleIds[3], // DOSKONALE OPANOWAŁ
        teacherId: nauczyciel2.id,
      },
      {
        studentId: student2.id,
        subjectId: subjects.find((s) => s.name === "Język polski")!.id,
        schoolYearId: schoolYear.id,
        gradeScaleId: gradeScaleIds[1], // ŚREDNIO OPANOWAŁ
        teacherId: nauczyciel1.id,
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
