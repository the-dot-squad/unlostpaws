"use client";

import { useRef, useImperativeHandle, forwardRef } from "react";
import { Turnstile } from "nextjs-turnstile";

/**
 * @typedef {object} TurnstileChallengeHandle
 * @property {() => void} run Start the deferred Turnstile challenge.
 * @property {() => void} reset Clear the widget for another attempt.
 * @property {() => boolean} isReady Whether the widget has finished loading.
 * @property {() => string | null} getToken Read the current token without resetting.
 */

/**
 * Turnstile widget with two modes:
 * - `deferred` — challenge runs only when `run()` is called (contact reveal).
 * - `invisible` — auto-runs on mount, hidden from the user (report form).
 *
 * @type {import("react").ForwardRefExoticComponent<{
 *   action: string;
 *   variant?: "deferred" | "invisible";
 *   onSuccess: (token: string) => void;
 *   onError?: () => void;
 *   onExpire?: () => void;
 *   onLoad?: () => void;
 *   className?: string;
 * } & import("react").RefAttributes<TurnstileChallengeHandle>>}
 */
export const TurnstileChallenge = forwardRef(function TurnstileChallenge(
  { action, variant = "deferred", onSuccess, onError, onExpire, onLoad, className },
  ref
) {
  const widgetRef = useRef(null);
  const isInvisible = variant === "invisible";

  useImperativeHandle(ref, () => ({
    run() {
      widgetRef.current?.execute();
    },
    reset() {
      widgetRef.current?.reset();
    },
    isReady() {
      return widgetRef.current?.isReady() ?? false;
    },
    getToken() {
      return widgetRef.current?.getResponse() ?? null;
    },
  }));

  return (
    <Turnstile
      ref={widgetRef}
      action={action}
      execution={isInvisible ? "render" : "execute"}
      appearance={isInvisible ? undefined : "interaction-only"}
      onSuccess={onSuccess}
      onError={onError}
      onExpire={onExpire}
      onLoad={onLoad}
      feedbackEnabled={false}
      className={isInvisible ? "sr-only" : className}
    />
  );
});
