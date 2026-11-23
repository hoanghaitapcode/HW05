import { SharedArray } from 'k6/data';
import { sleep } from 'k6';
import { loadRows, runJourney, selectedRow, makeSummary } from './journey.js';

const rows = new SharedArray('csv workflow data', () => loadRows());

export const options = {
  stages: [
    { duration: '10s', target: 1 },
    { duration: '20s', target: 3 },
    { duration: '45s', target: 3 },
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
  const summary = makeSummary(data);
  summary.scenario = 'Load';
  return { 'results/reports/load-summary.json': JSON.stringify(summary, null, 2) + '\n' };
}
