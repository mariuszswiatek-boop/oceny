#!/usr/bin/env bash
set -euo pipefail

COMPOSE="docker-compose -f docker-compose.prod.yml"
DB_USER="${DB_USER:-postgres1}"
DB_NAME="${DB_NAME:-oceny}"

echo "==> Applying schema fixes"

$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "ALTER TABLE \"User\" ADD COLUMN IF NOT EXISTS \"isActive\" BOOLEAN NOT NULL DEFAULT true;"

$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "ALTER TABLE \"MontessoriGradeScale\" ADD COLUMN IF NOT EXISTS \"isActive\" BOOLEAN NOT NULL DEFAULT true;"

$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "ALTER TABLE \"Subject\" ADD COLUMN IF NOT EXISTS \"sortOrder\" INTEGER NOT NULL DEFAULT 0;"
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "ALTER TABLE \"Subject\" ADD COLUMN IF NOT EXISTS \"isActive\" BOOLEAN NOT NULL DEFAULT true;"

$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "ALTER TABLE \"SchoolYear\" ADD COLUMN IF NOT EXISTS \"sortOrder\" INTEGER NOT NULL DEFAULT 0;"
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "ALTER TABLE \"SchoolYear\" ALTER COLUMN \"startDate\" DROP NOT NULL;"
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "ALTER TABLE \"SchoolYear\" ALTER COLUMN \"endDate\" DROP NOT NULL;"

$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "ALTER TABLE \"Class\" ADD COLUMN IF NOT EXISTS \"sortOrder\" INTEGER NOT NULL DEFAULT 0;"
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "ALTER TABLE \"Class\" ADD COLUMN IF NOT EXISTS \"isActive\" BOOLEAN NOT NULL DEFAULT true;"

$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "ALTER TABLE \"Student\" ADD COLUMN IF NOT EXISTS \"isActive\" BOOLEAN NOT NULL DEFAULT true;"

$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "ALTER TABLE \"ParentContact\" ADD COLUMN IF NOT EXISTS \"fullName\" TEXT;"
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "ALTER TABLE \"ParentContact\" ADD COLUMN IF NOT EXISTS \"phone\" TEXT;"
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "ALTER TABLE \"ParentContact\" ADD COLUMN IF NOT EXISTS \"isPrimary\" BOOLEAN NOT NULL DEFAULT false;"

$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "ALTER TABLE \"TeacherAssignment\" ADD COLUMN IF NOT EXISTS \"schoolYearId\" TEXT;"
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "ALTER TABLE \"TeacherAssignment\" ADD COLUMN IF NOT EXISTS \"isActive\" BOOLEAN NOT NULL DEFAULT true;"
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "UPDATE \"TeacherAssignment\" SET \"schoolYearId\" = (SELECT \"id\" FROM \"SchoolYear\" WHERE \"isActive\" = true ORDER BY \"createdAt\" DESC LIMIT 1) WHERE \"schoolYearId\" IS NULL;"
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "ALTER TABLE \"TeacherAssignment\" ALTER COLUMN \"schoolYearId\" SET NOT NULL;"
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "ALTER TABLE \"TeacherAssignment\" ADD CONSTRAINT \"TeacherAssignment_schoolYearId_fkey\" FOREIGN KEY (\"schoolYearId\") REFERENCES \"SchoolYear\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE;"
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "DROP INDEX IF EXISTS \"TeacherAssignment_teacherId_subjectId_classId_key\";"
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "CREATE UNIQUE INDEX IF NOT EXISTS \"TeacherAssignment_teacherId_subjectId_classId_schoolYearId_key\" ON \"TeacherAssignment\"(\"teacherId\",\"subjectId\",\"classId\",\"schoolYearId\");"
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "CREATE INDEX IF NOT EXISTS \"TeacherAssignment_schoolYearId_idx\" ON \"TeacherAssignment\"(\"schoolYearId\");"

$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "ALTER TYPE \"UserRole\" ADD VALUE IF NOT EXISTS 'TEACHER';"
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "ALTER TYPE \"UserRole\" ADD VALUE IF NOT EXISTS 'HOMEROOM';"

echo "==> Running seed"
$COMPOSE exec -T app npm run db:seed

echo "==> Ensure admin password"
$COMPOSE exec -T app node -e 'const {PrismaClient}=require("@prisma/client");const bcrypt=require("bcryptjs");const p=new PrismaClient();(async()=>{const hash=await bcrypt.hash("password123",10);await p.user.upsert({where:{email:"admin@szkola.pl"},update:{password:hash,isActive:true,roles:["ADMIN"]},create:{email:"admin@szkola.pl",password:hash,firstName:"Jan",lastName:"Admin",roles:["ADMIN"],isActive:true}});console.log("admin password set");await p.$disconnect();})();'

echo "==> Done"
