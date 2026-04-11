/*
  Warnings:

  - Added the required column `fileSize` to the `TaskFile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `TaskFile` ADD COLUMN `fileSize` INTEGER NOT NULL;
