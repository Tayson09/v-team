/*
  Warnings:

  - You are about to drop the column `path` on the `TaskFile` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `TaskFile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `TaskFile` DROP COLUMN `path`,
    DROP COLUMN `size`;
