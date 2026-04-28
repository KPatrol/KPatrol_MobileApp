// Catalog of quick actions the user can pin to the sidebar.
// Sidebar renders only those whose config has `enabled: true`; SettingsView lets the user
// choose which ones to enable and reorder them.

import type { LucideIcon } from 'lucide-react';
import {
  Lock,
  Moon,
  Radio,
  Shield,
  Siren,
  Sun,
  VideoIcon,
  VolumeX,
  Zap,
} from 'lucide-react';
import type { QuickActionId } from '@/store/robotStore';

export interface QuickActionDef {
  id: QuickActionId;
  label: string;
  description: string;
  icon: LucideIcon;
  // Tailwind tone for active glow — matches the cyan-HUD palette
  tone: 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky';
}

export const QUICK_ACTION_CATALOG: QuickActionDef[] = [
  {
    id: 'autoPatrol',
    label: 'Tuần tra tự động',
    description: 'Bật chế độ tuần tra theo waypoint đã ghi',
    icon: Shield,
    tone: 'cyan',
  },
  {
    id: 'ecoMode',
    label: 'Chế độ tiết kiệm',
    description: 'Giảm tốc độ và tải CPU để tiết kiệm pin',
    icon: Zap,
    tone: 'emerald',
  },
  {
    id: 'nightMode',
    label: 'Chế độ đêm',
    description: 'Bật night-vision và giảm độ sáng đèn LED',
    icon: Moon,
    tone: 'violet',
  },
  {
    id: 'mainLight',
    label: 'Đèn chiếu chính',
    description: 'Bật/tắt đèn LED phía trước',
    icon: Sun,
    tone: 'amber',
  },
  {
    id: 'warningLight',
    label: 'Đèn cảnh báo',
    description: 'Bật đèn nháy đỏ khi gặp sự cố',
    icon: Siren,
    tone: 'rose',
  },
  {
    id: 'lockControls',
    label: 'Khoá điều khiển',
    description: 'Chặn input điều khiển từ xa',
    icon: Lock,
    tone: 'rose',
  },
  {
    id: 'recordSession',
    label: 'Ghi camera',
    description: 'Ghi video phiên tuần tra hiện tại',
    icon: VideoIcon,
    tone: 'sky',
  },
  {
    id: 'silentMode',
    label: 'Im lặng',
    description: 'Tắt còi và chỉ giữ cảnh báo trên dashboard',
    icon: VolumeX,
    tone: 'cyan',
  },
];

export const QUICK_ACTION_BY_ID: Record<QuickActionId, QuickActionDef> =
  QUICK_ACTION_CATALOG.reduce((acc, def) => {
    acc[def.id] = def;
    return acc;
  }, {} as Record<QuickActionId, QuickActionDef>);

// Tone → Tailwind classes for the toggle pill in the sidebar
export const QUICK_ACTION_TONES: Record<
  QuickActionDef['tone'],
  { text: string; ring: string; bg: string; glow: string; iconBg: string }
> = {
  cyan: {
    text: 'text-cyan-300',
    ring: 'ring-cyan-400/40',
    bg: 'bg-cyan-500/10',
    glow: 'shadow-[0_0_14px_rgba(34,211,238,0.35)]',
    iconBg: 'bg-cyan-500/15',
  },
  emerald: {
    text: 'text-emerald-300',
    ring: 'ring-emerald-400/40',
    bg: 'bg-emerald-500/10',
    glow: 'shadow-[0_0_14px_rgba(16,185,129,0.35)]',
    iconBg: 'bg-emerald-500/15',
  },
  amber: {
    text: 'text-amber-300',
    ring: 'ring-amber-400/40',
    bg: 'bg-amber-500/10',
    glow: 'shadow-[0_0_14px_rgba(245,158,11,0.35)]',
    iconBg: 'bg-amber-500/15',
  },
  rose: {
    text: 'text-rose-300',
    ring: 'ring-rose-400/40',
    bg: 'bg-rose-500/10',
    glow: 'shadow-[0_0_14px_rgba(244,63,94,0.35)]',
    iconBg: 'bg-rose-500/15',
  },
  violet: {
    text: 'text-violet-300',
    ring: 'ring-violet-400/40',
    bg: 'bg-violet-500/10',
    glow: 'shadow-[0_0_14px_rgba(167,139,250,0.35)]',
    iconBg: 'bg-violet-500/15',
  },
  sky: {
    text: 'text-sky-300',
    ring: 'ring-sky-400/40',
    bg: 'bg-sky-500/10',
    glow: 'shadow-[0_0_14px_rgba(56,189,248,0.35)]',
    iconBg: 'bg-sky-500/15',
  },
};
