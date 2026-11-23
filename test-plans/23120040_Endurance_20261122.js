import { SharedArray } from 'k6/data';
import { sleep } from 'k6';
import { loadRows, runJourney, selectedRow, makeSummary } from './journey.js';

const rows = new SharedArray('csv workflow data', () => loadRows());

export const options = {
  vus: Number(__ENV.ENDURANCE_VUS || 5),
  duration: '12m',
  thresholds: { checks: ['rate>0.95'] },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)'],
};

export default function () {
  runJourney(selectedRow(rows));
  sleep(0.2);
}

export function handleSummary(data) {
  const summary = makeSummary(data);
  summary.scenario = 'Endurance';
  summary.vus = options.vus;
  return { 'results/reports/endurance-summary.json': JSON.stringify(summary, null, 2) + '\n' };
}
