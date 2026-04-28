'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type PhenikaaMapInnerType from './PhenikaaMapInner';

export type { Waypoint } from './PhenikaaMapInner';

// Leaflet touches `window` at import — keep client-only.
const PhenikaaMapInner = dynamic(() => import('./PhenikaaMapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-lg border border-dark-border bg-dark-card/50">
      <span className="text-sm text-dark-muted">Đang tải bản đồ Phenikaa…</span>
    </div>
  ),
});

type Props = ComponentProps<typeof PhenikaaMapInnerType>;

export function PhenikaaMap(props: Props) {
  return <PhenikaaMapInner {...props} />;
}
