type Subject = {
  id: string
  name: string
}

type GradeScale = {
  id: string
  label: string
  colorHex: string
}

type Student = {
  id: string
  firstName: string
  lastName: string
}

type Grade = {
  studentId: string
  subjectId: string
  gradeScaleId: string | null
}

type ClassInfo = {
  name: string
  schoolYearName: string
  homeroomName: string
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

const buildStudentSection = (
  student: Student,
  classInfo: ClassInfo,
  subjects: Subject[],
  gradeScales: GradeScale[],
  grades: Grade[]
) => {
  const gradeBySubject = new Map<string, string | null>()
  grades.forEach((grade) => {
    gradeBySubject.set(grade.subjectId, grade.gradeScaleId)
  })

  const rows = subjects
    .map((subject) => {
      const selected = gradeBySubject.get(subject.id) ?? null
      const scaleCells = gradeScales
        .map((scale) => {
          const isSelected = selected === scale.id
          return `
            <td class="scale-cell" style="color: ${scale.colorHex}">
              <span class="dot ${isSelected ? "selected" : ""}"></span>
            </td>
          `
        })
        .join("")

      return `
        <tr>
          <td class="subject-cell">${escapeHtml(subject.name)}</td>
          ${scaleCells}
          <td class="signature-cell"></td>
        </tr>
      `
    })
    .join("")

  return `
    <div class="page">
      <div class="header">
        <div class="title">ROK SZKOLNY ${escapeHtml(classInfo.schoolYearName)}</div>
        <div class="subtitle">OCENY ŚRÓDROCZNE</div>
      </div>
      <div class="meta">
        <div><span class="label">WYCHOWAWCA:</span> ${escapeHtml(classInfo.homeroomName)}</div>
        <div><span class="label">IMIĘ I NAZWISKO UCZNIA:</span> ${escapeHtml(
          `${student.firstName} ${student.lastName}`
        )}</div>
        <div><span class="label">KLASA:</span> ${escapeHtml(classInfo.name)}</div>
      </div>
      <table class="grades-table">
        <thead>
          <tr>
            <th class="subject-header">Przedmiot</th>
            ${gradeScales
              .map(
                (scale) => `
                  <th class="scale-header" style="color: ${scale.colorHex}">
                    ${escapeHtml(scale.label)}
                  </th>
                `
              )
              .join("")}
            <th class="signature-header">Podpis</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `
}

export const buildStudentPdfHtml = (options: {
  student: Student
  classInfo: ClassInfo
  subjects: Subject[]
  gradeScales: GradeScale[]
  grades: Grade[]
}) => {
  return `
    <!doctype html>
    <html lang="pl">
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: "DejaVu Sans", "Arial Unicode MS", sans-serif;
            font-size: 12px;
            color: #111827;
            margin: 0;
            padding: 0;
          }
          .page { width: 100%; }
          .header { text-align: left; margin-bottom: 16px; }
          .title { font-size: 18px; font-weight: 700; }
          .subtitle { font-size: 16px; font-weight: 700; margin-top: 6px; }
          .meta { margin-bottom: 16px; line-height: 1.5; }
          .label { font-weight: 600; }
          .grades-table { width: 100%; border-collapse: collapse; }
          .grades-table th, .grades-table td {
            border: 1px solid #111827;
            padding: 6px 8px;
            text-align: center;
            vertical-align: middle;
          }
          .subject-header, .subject-cell { text-align: left; width: 35%; }
          .signature-header, .signature-cell { width: 12%; }
          .scale-header { font-size: 10px; background: transparent; }
          .scale-cell { height: 24px; }
          .dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            border: 1px solid currentColor;
            display: inline-block;
          }
          .dot.selected {
            background: currentColor;
          }
        </style>
      </head>
      <body>
        ${buildStudentSection(
          options.student,
          options.classInfo,
          options.subjects,
          options.gradeScales,
          options.grades
        )}
      </body>
    </html>
  `
}

export const buildClassPdfHtml = (options: {
  students: Student[]
  classInfo: ClassInfo
  subjects: Subject[]
  gradeScales: GradeScale[]
  grades: Grade[]
}) => {
  const sections = options.students
    .map((student, idx) => {
      const studentGrades = options.grades.filter((grade) => grade.studentId === student.id)
      const section = buildStudentSection(
        student,
        options.classInfo,
        options.subjects,
        options.gradeScales,
        studentGrades
      )
      if (idx === options.students.length - 1) {
        return section
      }
      return `${section}<div class="page-break"></div>`
    })
    .join("")

  return `
    <!doctype html>
    <html lang="pl">
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: "DejaVu Sans", "Arial Unicode MS", sans-serif;
            font-size: 12px;
            color: #111827;
            margin: 0;
            padding: 0;
          }
          .page { width: 100%; page-break-after: always; }
          .page-break { page-break-after: always; }
          .header { text-align: left; margin-bottom: 16px; }
          .title { font-size: 18px; font-weight: 700; }
          .subtitle { font-size: 16px; font-weight: 700; margin-top: 6px; }
          .meta { margin-bottom: 16px; line-height: 1.5; }
          .label { font-weight: 600; }
          .grades-table { width: 100%; border-collapse: collapse; }
          .grades-table th, .grades-table td {
            border: 1px solid #111827;
            padding: 6px 8px;
            text-align: center;
            vertical-align: middle;
          }
          .subject-header, .subject-cell { text-align: left; width: 35%; }
          .signature-header, .signature-cell { width: 12%; }
          .scale-header { font-size: 10px; color: #111827; }
          .scale-cell { height: 24px; }
          .dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            border: 1px solid currentColor;
            display: inline-block;
          }
          .dot.selected {
            background: currentColor;
          }
        </style>
      </head>
      <body>
        ${sections}
      </body>
    </html>
  `
}
