-- AlterEnum
ALTER TYPE "AuthTokenType" ADD VALUE 'TWO_FACTOR_LOGIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "twoFactorSecret" TEXT,
ADD COLUMN "twoFactorPendingSecret" TEXT,
ADD COLUMN "twoFactorEnabledAt" TIMESTAMP(3);
