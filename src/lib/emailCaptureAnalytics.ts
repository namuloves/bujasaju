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
}

/**
 * Tracks the email funnel consistently across every capture surface.
 *
 * The impression uses IntersectionObserver instead of component mount so
 * responsive duplicates hidden with CSS do not inflate gate views. All
 * properties are intentionally low-cardinality and contain no email address
 * or other user-provided PII.
 */
export function useEmailCaptureAnalytics({
  captureSource,
  language,
  experimentVariant = 'baseline',
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
  }, [eventContext]);

  const trackFormStarted = useCallback(() => {
    if (formStarted.current) return;
    formStarted.current = true;
    trackEvent('email_form_started', eventContext());
  }, [eventContext]);

  const trackSignupCompleted = useCallback(
    (isNewSubscriber: boolean) => {
      trackEvent(isNewSubscriber ? 'sign_up' : 'email_signup_repeated', {
        ...eventContext(),
        subscriber_status: isNewSubscriber ? 'new' : 'returning',
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
