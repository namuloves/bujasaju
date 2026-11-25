'use client';

import { useCallback, useEffect, useRef } from 'react';
import { trackEvent } from '@/lib/analytics';

export type EmailCaptureSource = 'unlock-gate' | 'profile-wall' | 'match-results';

export type EmailSignupFailureReason =
  | 'invalid_email'
  | 'consent_required'
  | 'rate_limited'
  | 'request_rejected'
  | 'server_error'
  | 'storage_error'
  | 'network_error';

interface EmailCaptureAnalyticsOptions {
  captureSource: EmailCaptureSource;
  language: 'ko' | 'en';
  experimentVariant?: string;
  /**
   * Whether the gate is currently on screen and asking for an email.
   * Pass false while the real gate hasn't rendered yet (e.g. a loading
   * placeholder) or when it is showing an already-unlocked state. The
   * impression observer attaches when this turns true, so a gate that
   * mounts late is still counted. Defaults to true.
   */
  enabled?: boolean;
}

/**
 * Tracks the email funnel consistently across every capture surface.
 *
 * The impression uses IntersectionObserver instead of component mount so
 * responsive duplicates hidden with CSS do not inflate gate views. The
 * observer waits for `enabled`, so a gate that first renders a placeholder
 * is observed once the real element exists, not skipped for good. All
 * properties are intentionally low-cardinality and contain no email address
 * or other user-provided PII.
 */
export function useEmailCaptureAnalytics({
  captureSource,
  language,
  experimentVariant = 'baseline',
  enabled = true,
}: EmailCaptureAnalyticsOptions) {
  const gateRef = useRef<HTMLDivElement>(null);
  const gateViewed = useRef(false);
  const formStarted = useRef(false);

  const eventContext = useCallback(
    () => ({
      method: 'email',
      capture_source: captureSource,
      ui_language: language,
      experiment_variant: experimentVariant,
    }),
    [captureSource, experimentVariant, language],
  );

  useEffect(() => {
    if (!enabled) return;
    const element = gateRef.current;
    if (!element || gateViewed.current) return;

    const recordView = () => {
      if (gateViewed.current) return;
      gateViewed.current = true;
      trackEvent('email_gate_viewed', eventContext());
    };

    if (typeof IntersectionObserver === 'undefined') {
      recordView();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          recordView();
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, eventContext]);

  const trackFormStarted = useCallback(() => {
    if (formStarted.current) return;
    formStarted.current = true;
    trackEvent('email_form_started', eventContext());
  }, [eventContext]);

  const trackSignupCompleted = useCallback(
    (
      isNewContact: boolean,
      marketingConsent = true,
      isNewSubscriber = isNewContact,
    ) => {
      const isNewConversion = marketingConsent ? isNewSubscriber : isNewContact;
      trackEvent(isNewConversion ? 'sign_up' : 'email_signup_repeated', {
        ...eventContext(),
        contact_status: isNewContact ? 'new' : 'returning',
        subscriber_status: marketingConsent
          ? isNewSubscriber ? 'new' : 'returning'
          : 'not_subscribed',
        marketing_consent: marketingConsent,
      });
    },
    [eventContext],
  );

  const trackSignupFailed = useCallback(
    (failureReason: EmailSignupFailureReason, httpStatus?: number) => {
      trackEvent('email_signup_failed', {
        ...eventContext(),
        failure_reason: failureReason,
        ...(httpStatus === undefined ? {} : { http_status: httpStatus }),
      });
    },
    [eventContext],
  );

  return {
    gateRef,
    trackFormStarted,
    trackSignupCompleted,
    trackSignupFailed,
  };
}

export function emailFailureReasonForStatus(
  status: number,
): EmailSignupFailureReason {
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server_error';
  return 'request_rejected';
}
