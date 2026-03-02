-- AlterTable: add rfCode, wireCode to debts
ALTER TABLE "debts" ADD COLUMN "rf_code" TEXT;
ALTER TABLE "debts" ADD COLUMN "wire_code" TEXT;

-- CreateTable: debt_files
CREATE TABLE "debt_files" (
    "id" TEXT NOT NULL,
    "debt_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL DEFAULT 'application/pdf',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debt_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "debt_files_debt_id_idx" ON "debt_files"("debt_id");

-- AddForeignKey
ALTER TABLE "debt_files" ADD CONSTRAINT "debt_files_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
