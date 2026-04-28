'use client';

import { useState } from 'react';
import { Map, Wrench } from 'lucide-react';
import { PatrolPanel } from '@/components/dashboard/PatrolPanel';
import { PatrolRouteView } from './PatrolRouteView';

type Tab = 'route' | 'legacy';

export function PatrolView() {
  const [tab, setTab] = useState<Tab>('route');

  return (
    <div className="h-full flex flex-col gap-3 md:gap-4 min-h-0">
      <div className="relative inline-flex p-1 rounded-2xl bg-slate-900/80 backdrop-blur-sm ring-1 ring-cyan-500/30 shadow-[0_0_18px_rgba(34,211,238,0.15)] shrink-0 self-start overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
        <button
          onClick={() => setTab('route')}
          className={`relative flex items-center gap-2 px-4 md:px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all min-h-[40px] ${
            tab === 'route'
              ? 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-[0_0_18px_rgba(34,211,238,0.5)] ring-1 ring-cyan-300/40'
              : 'text-slate-400 hover:text-cyan-200'
          }`}
        >
          <Map className="w-4 h-4" />
          <span className="whitespace-nowrap">Lộ trình GPS</span>
        </button>
        <button
          onClick={() => setTab('legacy')}
          className={`relative flex items-center gap-2 px-4 md:px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all min-h-[40px] ${
            tab === 'legacy'
              ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-[0_0_18px_rgba(168,85,247,0.5)] ring-1 ring-purple-300/40'
              : 'text-slate-400 hover:text-purple-200'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span className="whitespace-nowrap">Operations</span>
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {tab === 'route' ? <PatrolRouteView /> : <PatrolPanel />}
      </div>
    </div>
  );
}
