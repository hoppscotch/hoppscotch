-- CreateTable
CREATE TABLE "InfraConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedOn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfraConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InfraConfig_name_key" ON "InfraConfig"("name");
