import { SharedArray } from 'k6/data';
import { sleep } from 'k6';
import { loadRows, runJourney, selectedRow, htmlSummary } from './journey.js';

const rows = new SharedArray('csv workflow data', () => loadRows());

export const options = {
  stages: [
    { duration: '10s', target: 2 },
    { duration: '5s', target: 7 },
    { duration: '30s', target: 7 },
    { duration: '5s', target: 2 },
    { duration: '10s', target: 0 },
  ],
  thresholds: { checks: ['rate>0.95'] },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)'],
};

export default function () {
  runJourney(selectedRow(rows));
  sleep(0.2);
}

export function handleSummary(data) {
  return { 'results/reports/spike-summary.html': htmlSummary(data, 'Spike') };
}
