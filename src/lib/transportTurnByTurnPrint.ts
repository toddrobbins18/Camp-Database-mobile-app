export type TurnByTurnStep = {
  instruction: string;
  name: string;
  distanceMi: number;
  durationSec: number;
  segmentIndex?: number;
};

export type TurnByTurnStop = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  pickupTime: string;
};

export function formatTurnDuration(durationSec: number): string {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return '';
  if (durationSec < 45) return `${Math.max(1, Math.round(durationSec))} sec`;
  const minutes = durationSec / 60;
  if (minutes < 10) return `${minutes.toFixed(1)} min`;
  return `${Math.round(minutes)} min`;
}

export function formatTurnDistance(distanceMi: number): string {
  if (!Number.isFinite(distanceMi) || distanceMi <= 0) return '';
  if (distanceMi < 0.1) return `${Math.round(distanceMi * 5280)} ft`;
  return `${distanceMi.toFixed(2)} mi`;
}

export function googleMapsDirUrl(stops: TurnByTurnStop[]): string {
  return `https://www.google.com/maps/dir/${stops.map((s) => `${s.lat},${s.lng}`).join('/')}`;
}

export function buildTurnByTurnShareText(options: {
  bus: string;
  routeName: string;
  totalDistanceMi: number;
  totalDurationSec: number;
  steps: TurnByTurnStep[];
  stopLabels: string[];
  stops: TurnByTurnStop[];
}): string {
  const totals = [
    options.totalDistanceMi > 0 ? `${options.totalDistanceMi.toFixed(1)} mi` : '',
    options.totalDurationSec > 0 ? `~${Math.round(options.totalDurationSec / 60)} min` : '',
  ].filter(Boolean);

  const lines = [
    `${options.bus} — ${options.routeName}`,
    totals.length ? `Total: ${totals.join(' · ')}` : 'First stop to last stop',
    '',
    'Stops',
    ...options.stops.map((stop, i) => {
      const label = options.stopLabels[i] || stop.name;
      const time = stop.pickupTime && stop.pickupTime !== '—' ? ` · ${stop.pickupTime}` : '';
      return `${i + 1}. ${label}${time}\n   ${stop.address}`;
    }),
  ];

  if (options.stops.length >= 2) {
    lines.push('', 'Google Maps', googleMapsDirUrl(options.stops));
  }

  let curSeg = -1;
  options.steps.forEach((step) => {
    const seg = step.segmentIndex ?? 0;
    if (seg !== curSeg) {
      curSeg = seg;
      const from = options.stopLabels[seg] || `Stop ${seg + 1}`;
      const to = options.stopLabels[seg + 1] || `Stop ${seg + 2}`;
      const segSteps = options.steps.filter((s) => (s.segmentIndex ?? 0) === seg);
      const segSec = segSteps.reduce((sum, s) => sum + (s.durationSec || 0), 0);
      const segMi = segSteps.reduce((sum, s) => sum + (s.distanceMi || 0), 0);
      const meta = [formatTurnDistance(segMi), formatTurnDuration(segSec)].filter(Boolean).join(' · ');
      lines.push('', `Leg ${seg + 1}: ${from} → ${to}${meta ? ` (${meta})` : ''}`);
    }
    const qty = [formatTurnDistance(step.distanceMi), formatTurnDuration(step.durationSec)].filter(Boolean).join(', ');
    const onStreet = step.name && step.name !== '-' ? ` (on ${step.name})` : '';
    lines.push(`• ${step.instruction}${onStreet}${qty ? ` — ${qty}` : ''}`);
  });

  return lines.join('\n');
}
