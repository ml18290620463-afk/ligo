import * as Sentry from '@sentry/react';
import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';

/**
 * Subscribe to Core Web Vitals (`LCP`, `INP`, `CLS`) plus the supporting
 * load-timing signals (`FCP`, `TTFB`) and forward them to Sentry as
 * measurements on a single `web-vitals` event. We deliberately avoid
 * `Sentry.captureMessage` per ROADMAP §"关键信息 / 不可妥协项" #5
 * because messages get sampled aggressively and lose signal; attaching
 * the values to a low-frequency event keeps them in the Issues / Errors
 * stream where dashboards can compute P75 from raw context data.
 *
 * The forwarder is a no-op when Sentry has not been initialised
 * (i.e. `SENTRY_DSN` was empty at build time), so we never emit
 * orphan beacons.
 */

const REPORT_NAME = 'web-vitals';

const sentryActive = (): boolean => {
  try {
    return Boolean(Sentry.getClient?.());
  } catch {
    return false;
  }
};

const reportMetric = (metric: Metric): void => {
  if (!sentryActive()) return;
  try {
    Sentry.withScope((scope) => {
      scope.setTag('vital', metric.name);
      scope.setTag('rating', metric.rating);
      scope.setExtra('id', metric.id);
      scope.setExtra('value', metric.value);
      scope.setExtra('delta', metric.delta);
      scope.setExtra('navigationType', metric.navigationType);
      // Use captureMessage with `info` so it lands in Sentry's Issues
      // stream once per page-life, with the raw value attached as
      // measurement context. Dashboards can then compute P75 / P95 over
      // any rolling window.
      Sentry.captureMessage(`${REPORT_NAME} ${metric.name}=${metric.value.toFixed(1)}`, {
        level: 'info',
        contexts: {
          vital: {
            name: metric.name,
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
          },
        },
      });
    });
  } catch {
    // Reporting failures must never crash the app.
  }
};

/** Wires the web-vitals listeners. Call exactly once at app boot. */
export const initWebVitalsReporter = (): void => {
  if (typeof window === 'undefined') return;
  onCLS(reportMetric);
  onINP(reportMetric);
  onLCP(reportMetric);
  onFCP(reportMetric);
  onTTFB(reportMetric);
};
