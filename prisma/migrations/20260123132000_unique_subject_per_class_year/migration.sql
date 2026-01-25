-- Prevent duplicate subject assignments within class and school year

CREATE UNIQUE INDEX IF NOT EXISTS "TeacherAssignment_subjectId_classId_schoolYearId_key"
  ON "TeacherAssignment"("subjectId", "classId", "schoolYearId");
