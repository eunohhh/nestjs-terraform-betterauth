-- CreateTable
CREATE TABLE "app_login_codes" (
    "code" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_login_codes_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX "app_login_codes_userId_idx" ON "app_login_codes"("userId");

-- CreateIndex
CREATE INDEX "app_login_codes_expiresAt_idx" ON "app_login_codes"("expiresAt");

-- AddForeignKey
ALTER TABLE "app_login_codes" ADD CONSTRAINT "app_login_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
