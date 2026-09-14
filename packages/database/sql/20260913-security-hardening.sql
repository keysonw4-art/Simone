-- Additive and rerunnable; compatible with the previous deployment.
-- SQL is required for RLS/privileges, which Prisma schema cannot represent.
ALTER TABLE public."PasswordResetToken" ENABLE ROW LEVEL SECURITY;
-- statement
REVOKE ALL ON public."PasswordResetToken" FROM anon, authenticated;
-- statement
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;
-- statement
ALTER TABLE public."PasswordResetToken" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT -1;
-- statement
ALTER TABLE public."Purchase"
  ADD COLUMN IF NOT EXISTS "pendingKey" TEXT,
  ADD COLUMN IF NOT EXISTS "checkoutExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "checkoutUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "snapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "accessSuspended" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "refundedCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "paymentEventAt" BIGINT NOT NULL DEFAULT 0;
-- statement
CREATE UNIQUE INDEX IF NOT EXISTS "Purchase_pendingKey_key" ON public."Purchase"("pendingKey");
-- statement
CREATE INDEX IF NOT EXISTS "Purchase_productId_status_checkoutExpiresAt_idx" ON public."Purchase"("productId", "status", "checkoutExpiresAt");
-- statement
CREATE TABLE IF NOT EXISTS public."RateLimit" (
  "key" TEXT PRIMARY KEY, "hits" INTEGER NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL
);
-- statement
CREATE INDEX IF NOT EXISTS "RateLimit_expiresAt_idx" ON public."RateLimit"("expiresAt");
-- statement
CREATE TABLE IF NOT EXISTS public."EmailDelivery" (
  "key" TEXT PRIMARY KEY, "leaseUntil" TIMESTAMP(3), "leaseToken" TEXT,
  "sentAt" TIMESTAMP(3), "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- statement
CREATE INDEX IF NOT EXISTS "EmailDelivery_sentAt_leaseUntil_idx" ON public."EmailDelivery"("sentAt", "leaseUntil");
-- statement
ALTER TABLE public."RateLimit" ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE public."EmailDelivery" ENABLE ROW LEVEL SECURITY;
-- statement
REVOKE ALL ON public."RateLimit", public."EmailDelivery" FROM anon, authenticated;

-- statement
ALTER TABLE public."Certificate" ALTER COLUMN "courseId" DROP NOT NULL;
-- statement
ALTER TABLE public."Certificate" ADD COLUMN IF NOT EXISTS "productId" TEXT REFERENCES public."Product"("id");
-- statement
CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_userId_productId_key" ON public."Certificate"("userId", "productId");
-- statement
CREATE TABLE IF NOT EXISTS public."JobState" ("key" TEXT PRIMARY KEY, "cursor" TEXT, "leaseUntil" TIMESTAMP(3), "leaseToken" TEXT);
-- statement
ALTER TABLE public."JobState" ENABLE ROW LEVEL SECURITY;
-- statement
REVOKE ALL ON public."JobState" FROM anon, authenticated;
