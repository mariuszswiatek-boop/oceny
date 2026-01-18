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
  term: "MIDYEAR" | "FINAL"
}

type PdfTermMode = "MIDYEAR" | "FINAL" | "BOTH"

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

const buildGradesTable = (
  title: string,
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
          const dotStyle = isSelected
            ? `background:${scale.colorHex}; border-color:${scale.colorHex};`
            : "background:transparent; border-color:#111827;"
          return `
            <td class="scale-cell">
              <span class="dot" style="${dotStyle}"></span>
            </td>
          `
        })
        .join("")

      return `
        <tr class="row">
          <td class="subject-cell">${escapeHtml(subject.name)}</td>
          ${scaleCells}
          <td class="signature-cell"></td>
        </tr>
      `
    })
    .join("")

  return `
    <div class="section">
      <div class="section-title">${escapeHtml(title)}</div>
      <table class="grades-table">
        <thead>
          <tr class="header-row">
            <th class="subject-header">Przedmiot</th>
            ${gradeScales
              .map(
                (scale) => `
                  <th class="scale-header">
                    ${escapeHtml(scale.label)}
                  </th>
                `
              )
              .join("")}
            <th class="signature-header">Podpis</th>
          </tr>
          <tr class="divider"><th colspan="${gradeScales.length + 2}"></th></tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `
}

const buildStudentSection = (
  student: Student,
  classInfo: ClassInfo,
  subjects: Subject[],
  gradeScales: GradeScale[],
  grades: Grade[],
  termMode: PdfTermMode
) => {
  const midyearGrades = grades.filter((grade) => grade.term === "MIDYEAR")
  const finalGrades = grades.filter((grade) => grade.term === "FINAL")
  const subtitle =
    termMode === "BOTH"
      ? "OCENY"
      : termMode === "MIDYEAR"
        ? "OCENY ŚRÓDROCZNE"
        : "OCENY ROCZNE"
  const sections =
    termMode === "BOTH"
      ? `${buildGradesTable("OCENY ŚRÓDROCZNE", subjects, gradeScales, midyearGrades)}
      ${buildGradesTable("OCENY ROCZNE", subjects, gradeScales, finalGrades)}`
      : termMode === "MIDYEAR"
        ? buildGradesTable("OCENY ŚRÓDROCZNE", subjects, gradeScales, midyearGrades)
        : buildGradesTable("OCENY ROCZNE", subjects, gradeScales, finalGrades)

  return `
    <div class="page">
      <div class="header">
        <div class="title">ROK SZKOLNY ${escapeHtml(classInfo.schoolYearName)}</div>
        <div class="subtitle">${subtitle}</div>
      </div>
      <div class="meta">
        <div><span class="label">WYCHOWAWCA:</span> ${escapeHtml(classInfo.homeroomName)}</div>
        <div><span class="label">IMIĘ I NAZWISKO UCZNIA:</span> ${escapeHtml(
          `${student.firstName} ${student.lastName}`
        )}</div>
        <div><span class="label">KLASA:</span> ${escapeHtml(classInfo.name)}</div>
      </div>
      ${sections}
    </div>
  `
}

export const buildStudentPdfHtml = (options: {
  student: Student
  classInfo: ClassInfo
  subjects: Subject[]
  gradeScales: GradeScale[]
  grades: Grade[]
  termMode: PdfTermMode
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
          .header { text-align: left; margin-bottom: 18px; }
          .title { font-size: 18px; font-weight: 700; }
          .subtitle { font-size: 16px; font-weight: 700; margin-top: 6px; }
          .meta { margin-bottom: 18px; line-height: 1.6; }
          .label { font-weight: 700; margin-right: 8px; }
          .section { margin-bottom: 18px; }
          .section-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
          .grades-table { width: 100%; border-collapse: collapse; }
          .grades-table th, .grades-table td {
            padding: 6px 6px;
            text-align: center;
            vertical-align: middle;
          }
          .subject-header, .subject-cell { text-align: left; width: 38%; }
          .signature-header, .signature-cell { width: 10%; }
          .scale-header {
            font-size: 10px;
            font-weight: 700;
            color: #111827;
          }
          .divider th {
            border-bottom: 1px solid #111827;
            padding: 0;
            height: 8px;
          }
          .row td {
            border-bottom: 1px solid #e5e7eb;
          }
          .scale-cell { height: 24px; }
          .dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            border: 1px solid #111827;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        ${buildStudentSection(
          options.student,
          options.classInfo,
          options.subjects,
          options.gradeScales,
          options.grades,
          options.termMode
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
  termMode: PdfTermMode
}) => {
  const sections = options.students
    .map((student, idx) => {
      const studentGrades = options.grades.filter((grade) => grade.studentId === student.id)
      const section = buildStudentSection(
        student,
        options.classInfo,
        options.subjects,
        options.gradeScales,
        studentGrades,
        options.termMode
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
          .header { text-align: left; margin-bottom: 18px; }
          .title { font-size: 18px; font-weight: 700; }
          .subtitle { font-size: 16px; font-weight: 700; margin-top: 6px; }
          .meta { margin-bottom: 18px; line-height: 1.6; }
          .label { font-weight: 700; margin-right: 8px; }
          .section { margin-bottom: 18px; }
          .section-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
          .grades-table { width: 100%; border-collapse: collapse; }
          .grades-table th, .grades-table td {
            padding: 6px 6px;
            text-align: center;
            vertical-align: middle;
          }
          .subject-header, .subject-cell { text-align: left; width: 38%; }
          .signature-header, .signature-cell { width: 10%; }
          .scale-header {
            font-size: 10px;
            font-weight: 700;
            color: #111827;
          }
          .divider th {
            border-bottom: 1px solid #111827;
            padding: 0;
            height: 8px;
          }
          .row td {
            border-bottom: 1px solid #e5e7eb;
          }
          .scale-cell { height: 24px; }
          .dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            border: 1px solid #111827;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        ${sections}
      </body>
    </html>
  `
}
