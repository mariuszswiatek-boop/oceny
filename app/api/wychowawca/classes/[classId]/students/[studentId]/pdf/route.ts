import { NextResponse } from "next/server"
import { requireRole, canTeacherAccessClassAsHomeroom, isStudentInClass } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { PDFDocument, rgb } from "pdf-lib"
import fontkit from "@pdf-lib/fontkit"
import { readFile } from "fs/promises"
import { join } from "path"

const wrapText = (text: string, font: any, size: number, maxWidth: number) => {
  const words = text.split(" ")
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next
    } else {
      if (current) lines.push(current)
      current = word
    }
  }

  if (current) lines.push(current)
  return lines
}

const drawWrappedText = (
  page: any,
  text: string,
  x: number,
  y: number,
  font: any,
  size: number,
  maxWidth: number,
  lineHeight: number,
  center = false
) => {
  const lines = wrapText(text, font, size, maxWidth)
  lines.forEach((line, idx) => {
    const textWidth = font.widthOfTextAtSize(line, size)
    const drawX = center ? x + (maxWidth - textWidth) / 2 : x
    page.drawText(line, { x: drawX, y: y - idx * lineHeight, size, font })
  })
  return lines.length
}

const drawCenteredText = (
  page: any,
  text: string,
  x: number,
  y: number,
  font: any,
  size: number
) => {
  const textWidth = font.widthOfTextAtSize(text, size)
  page.drawText(text, { x: x - textWidth / 2, y, size, font })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string; studentId: string }> }
) {
  try {
    const user = await requireRole("WYCHOWAWCA")
    const { classId, studentId } = await params
    const { searchParams } = new URL(request.url)
    const schoolYearId = searchParams.get("schoolYearId")

    if (!schoolYearId) {
      return NextResponse.json({ error: "Missing schoolYearId" }, { status: 400 })
    }

    // Sprawdź uprawnienia
    const hasAccess = await canTeacherAccessClassAsHomeroom(user.id, classId)
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const studentInClass = await isStudentInClass(studentId, classId)
    if (!studentInClass) {
      return NextResponse.json({ error: "Student not in class" }, { status: 403 })
    }

    // Pobierz dane
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: {
          include: {
            teacher: true,
            schoolYear: true,
          },
        },
      },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const subjects = await prisma.subject.findMany({
      orderBy: { name: "asc" },
    })

    const grades = await prisma.studentGrade.findMany({
      where: {
        studentId,
        schoolYearId,
      },
      include: {
        gradeScale: true,
        subject: true,
      },
    })

    const gradeScales = await prisma.montessoriGradeScale.findMany({
      orderBy: { sortOrder: "asc" },
    })

    // Generuj PDF
    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    let page = pdfDoc.addPage([595, 842]) // A4
    const fontBytes = await readFile(
      join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf")
    )
    const boldFontBytes = await readFile(
      join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf")
    )
    const font = await pdfDoc.embedFont(fontBytes)
    const boldFont = await pdfDoc.embedFont(boldFontBytes)

    let y = 800
    const margin = 40
    const pageWidth = 595
    const pageHeight = 842

    // Nagłówek
    page.drawText("ROK SZKOLNY " + student.class.schoolYear.name, {
      x: margin,
      y,
      size: 16,
      font: boldFont,
    })
    y -= 30

    page.drawText("OCENY ŚRÓDROCZNE", {
      x: margin,
      y,
      size: 16,
      font: boldFont,
    })
    y -= 40

    // Wychowawca
    page.drawText("WYCHOWAWCA:", {
      x: margin,
      y,
      size: 12,
      font: boldFont,
    })
    page.drawText(
      `${student.class.teacher?.firstName || ""} ${student.class.teacher?.lastName || ""}`,
      {
        x: margin + 120,
        y,
        size: 12,
        font,
      }
    )
    y -= 25

    // Uczeń
    page.drawText("IMIĘ I NAZWISKO UCZNIA:", {
      x: margin,
      y,
      size: 12,
      font: boldFont,
    })
    page.drawText(`${student.firstName} ${student.lastName}`, {
      x: margin + 180,
      y,
      size: 12,
      font,
    })
    y -= 25

    page.drawText("KLASA:", {
      x: margin,
      y,
      size: 12,
      font: boldFont,
    })
    page.drawText(student.class.name, {
      x: margin + 60,
      y,
      size: 12,
      font,
    })
    y -= 40

    // Tabela
    const tableStartY = y
    const rowHeight = 24
    const colWidths = [180, 70, 70, 70, 70, 60] // Przedmiot + 4 oceny + podpis
    const tableWidth = colWidths.reduce((sum, width) => sum + width, 0)
    const gradeHeaderSize = 7
    const headerHeight = 32
    const headerY = y

    // Nagłówki kolumn
    page.drawText("Przedmiot", {
      x: margin,
      y: headerY,
      size: 9,
      font: boldFont,
    })

    gradeScales.forEach((scale, idx) => {
      const x = margin + colWidths[0] + idx * colWidths[1]
      drawWrappedText(
        page,
        scale.label,
        x,
        headerY,
        boldFont,
        gradeHeaderSize,
        colWidths[1],
        8,
        true
      )
    })

    drawCenteredText(
      page,
      "Podpis",
      margin + colWidths[0] + 4 * colWidths[1] + colWidths[5] / 2,
      headerY,
      boldFont,
      9
    )

    const headerBottomY = headerY - headerHeight
    const headerLineY = headerBottomY + 17
    // Linia pod nagłówkiem
    page.drawLine({
      start: { x: margin, y: headerLineY },
      end: { x: margin + tableWidth, y: headerLineY },
      thickness: 1,
      color: rgb(0, 0, 0),
    })
    y = headerLineY - 28

    // Wiersze przedmiotów
    subjects.forEach((subject) => {
      if (y < 100) {
        // Nowa strona jeśli potrzeba
        const newPage = pdfDoc.addPage([595, 842])
        y = 800
        page = newPage
      }

      const grade = grades.find((g) => g.subjectId === subject.id)
      const gradeScaleIndex = grade?.gradeScale
        ? gradeScales.findIndex((gs) => gs.id === grade.gradeScaleId)
        : -1

      // Nazwa przedmiotu
      page.drawText(subject.name, {
        x: margin,
        y,
        size: 9,
        font,
      })

      // Zaznaczenie oceny
      gradeScales.forEach((scale, idx) => {
        const x = margin + colWidths[0] + idx * colWidths[1] + colWidths[1] / 2
        if (gradeScaleIndex === idx) {
          // Rysuj kółko wypełnione
          page.drawCircle({
            x,
            y: y + 5,
            size: 5,
            color: rgb(
              parseInt(scale.colorHex.slice(1, 3), 16) / 255,
              parseInt(scale.colorHex.slice(3, 5), 16) / 255,
              parseInt(scale.colorHex.slice(5, 7), 16) / 255
            ),
          })
        } else {
          // Puste kółko
          page.drawCircle({
            x,
            y: y + 5,
            size: 5,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
          })
        }
      })

      y -= rowHeight
    })

    const pdfBytes = await pdfDoc.save()
    const pdfArrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    ) as ArrayBuffer
    const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" })

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="oceny_${student.firstName}_${student.lastName}_${student.class.schoolYear.name}.pdf"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
