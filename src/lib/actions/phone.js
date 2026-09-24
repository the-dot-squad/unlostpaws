/** @file Premium phone verification — Prelude OTP send + confirm. */
"use server";

import { withAuthAction } from "@/lib/auth/session";
import { authUserIdFilter, getAuthUserById, updateAuthUserById } from "@/lib/auth/users";
import {
  isPremium,
  phoneChangeAvailableAt,
} from "@/lib/premium/entitlements";
import { sendPhoneCode, checkPhoneCode } from "@/lib/prelude/verify";
import { validate, startPhoneVerificationSchema, confirmPhoneVerificationSchema } from "@/lib/validation";
import { getMongoDb } from "@/config/db";
import { revalidateLocalizedPath } from "@/lib/i18n/revalidate";

const RESEND_COOLDOWN_MS = 2 * 60 * 1000;
const MAX_SENDS_PER_DAY = 3;
const MAX_CHECKS_PER_DAY = 3;

function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/**
 * @param {object | null | undefined} raw
 * @param {string} phone
 */
function normalizeOtpState(raw, phone) {
  const dayKey = utcDayKey();
  const prev = raw && typeof raw === "object" ? raw : {};
  const sameDay = prev.dayKey === dayKey;
  const samePhone = prev.dayPhone === phone;

  if (sameDay && samePhone) {
    return {
      pendingPhone: prev.pendingPhone || null,
      dayKey,
      dayPhone: phone,
      sendCount: Number(prev.sendCount) || 0,
      checkCount: Number(prev.checkCount) || 0,
      lastSentAt: prev.lastSentAt ? new Date(prev.lastSentAt) : null,
      resendsUsed: Number(prev.resendsUsed) || 0,
    };
  }

  return {
    pendingPhone: sameDay && prev.pendingPhone === phone ? prev.pendingPhone : null,
    dayKey,
    dayPhone: phone,
    sendCount: 0,
    checkCount: 0,
    lastSentAt:
      sameDay && prev.pendingPhone === phone && prev.lastSentAt
        ? new Date(prev.lastSentAt)
        : null,
    resendsUsed: sameDay && prev.pendingPhone === phone ? Number(prev.resendsUsed) || 0 : 0,
  };
}

/**
 * @param {object | null | undefined} user
 * @param {string} nextPhone
 * @returns {{ error: "phone_change_cooldown", availableAt: string } | null}
 */
function phoneChangeCooldownError(user, nextPhone) {
  const currentPhone = user?.phone || "";
  if (nextPhone === currentPhone) return null;

  const availableAt = phoneChangeAvailableAt(user);
  if (!availableAt) return null;

  return {
    error: "phone_change_cooldown",
    availableAt: availableAt.toISOString(),
  };
}

/** @param {string} phone @param {string} userId */
async function findVerifiedPhoneOwner(phone, userId) {
  const db = await getMongoDb();
  return db.collection("user").findOne({
    $and: [
      { phone, phoneVerified: true },
      { $nor: [authUserIdFilter(userId)] },
    ],
  });
}

/**
 * Start or resend phone OTP (Premium only). Does not commit `user.phone` on change.
 * @param {{ phone: string }} data
 */
export async function startPhoneVerification(data) {
  return withAuthAction("startPhoneVerification", async (session) => {
    const parsed = validate(startPhoneVerificationSchema, data);
    if (!parsed.ok || !parsed.data.phone) {
      return { error: "invalid_phone" };
    }

    const phone = parsed.data.phone;
    const user = await getAuthUserById(session.user.id);
    if (!user) return { error: "user_not_found" };
    if (!isPremium(user)) return { error: "premium_required" };

    const currentPhone = user.phone || "";
    if (phone === currentPhone && user.phoneVerified) {
      return { error: "already_verified" };
    }

    const cooldown = phoneChangeCooldownError(user, phone);
    if (cooldown) return cooldown;

    const otp = normalizeOtpState(user.phoneOtp, phone);

    if (otp.sendCount >= MAX_SENDS_PER_DAY) {
      return { error: "otp_daily_limit" };
    }

    const isResend = otp.pendingPhone === phone && otp.lastSentAt;
    if (isResend) {
      const elapsed = Date.now() - otp.lastSentAt.getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        return {
          error: "otp_resend_wait",
          retryAfterSec: Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000),
        };
      }
      if (otp.resendsUsed >= 1) {
        return { error: "otp_resend_exhausted" };
      }
    }

    const sent = await sendPhoneCode({
      phone,
      correlationId: session.user.id,
    });
    if (sent.error) return { error: sent.error };

    const now = new Date();
    const nextOtp = {
      pendingPhone: phone,
      dayKey: otp.dayKey,
      dayPhone: phone,
      sendCount: otp.sendCount + 1,
      checkCount: otp.checkCount,
      lastSentAt: now,
      resendsUsed: isResend ? otp.resendsUsed + 1 : 0,
    };

    await updateAuthUserById(session.user.id, { phoneOtp: nextOtp });

    return {
      ok: true,
      retryAfterSec: Math.ceil(RESEND_COOLDOWN_MS / 1000),
      resendsRemaining: Math.max(0, 1 - nextOtp.resendsUsed),
    };
  });
}

/**
 * Confirm OTP and commit phone + phoneVerified.
 * @param {{ phone: string, code: string }} data
 */
export async function confirmPhoneVerification(data) {
  return withAuthAction("confirmPhoneVerification", async (session) => {
    const parsed = validate(confirmPhoneVerificationSchema, data);
    if (!parsed.ok || !parsed.data.phone) {
      return { error: parsed.error === "invalid_phone" ? "invalid_phone" : "invalid_code" };
    }

    const phone = parsed.data.phone;
    const code = parsed.data.code;
    const user = await getAuthUserById(session.user.id);
    if (!user) return { error: "user_not_found" };
    if (!isPremium(user)) return { error: "premium_required" };

    const cooldown = phoneChangeCooldownError(user, phone);
    if (cooldown) return cooldown;

    const otp = normalizeOtpState(user.phoneOtp, phone);
    if (!otp.pendingPhone || otp.pendingPhone !== phone) {
      return { error: "otp_not_started" };
    }

    if (otp.checkCount >= MAX_CHECKS_PER_DAY) {
      return { error: "otp_daily_limit" };
    }

    const taken = await findVerifiedPhoneOwner(phone, session.user.id);
    if (taken) {
      return { error: "phone_already_verified" };
    }

    const checked = await checkPhoneCode({ phone, code });

    const nextCheckCount = otp.checkCount + 1;
    if (checked.error) {
      await updateAuthUserById(session.user.id, {
        phoneOtp: {
          ...otp,
          lastSentAt: otp.lastSentAt,
          checkCount: nextCheckCount,
        },
      });
      return { error: checked.error };
    }

    const previousPhone = user.phone || "";
    const isSwap = Boolean(previousPhone) && user.phoneVerified && previousPhone !== phone;
    const now = new Date();

    await updateAuthUserById(session.user.id, {
      phone,
      phoneVerified: true,
      phoneVerifiedAt: now,
      ...(isSwap ? { phoneChangedAt: now } : {}),
      phoneOtp: {
        pendingPhone: null,
        dayKey: otp.dayKey,
        dayPhone: phone,
        sendCount: otp.sendCount,
        checkCount: nextCheckCount,
        lastSentAt: null,
        resendsUsed: 0,
      },
    });

    await revalidateLocalizedPath("/");
    await revalidateLocalizedPath("/account/settings");
    return { success: true };
  });
}
