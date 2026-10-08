/** Each cron HTTP call stays short. Node's fetch gives up after five minutes of silence. */
export const CRON_HTTP_MS = 60 * 1000;

export const CRON_POLL_MS = 15 * 1000;

/** How long the LinkedIn cron keeps checking after it has asked for a search. */
export const CRON_DEADLINE_MS = 45 * 60 * 1000;

/** The pipeline holds the run lock a little longer than the cron is willing to wait. */
export const RUN_LOCK_MS = 50 * 60 * 1000;
