-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "loggedIn" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PasswordlessVerification" ALTER COLUMN "expiresOn" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "createdOn" SET DATA TYPE TIMESTAMP(3);
