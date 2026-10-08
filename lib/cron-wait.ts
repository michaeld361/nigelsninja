/**
 * Node's fetch stops listening after five minutes of silence.
 * A LinkedIn search is three actor calls, so the cron has to wait longer than that,
 * and still finish inside the twenty-minute run lock.
 */
export const CRON_WAIT_MS = 16 * 60 * 1000;
