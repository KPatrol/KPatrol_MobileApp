'use client';

import {
  RotateCcw,
  AlertTriangle,
  Pause,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMQTT } from '@/providers/MQTTProvider';

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
  disabled?: boolean;
}

function ActionButton({ icon, label, onClick, variant = 'default', disabled }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center justify-center gap-2 p-4 rounded-lg',
        'transition-all duration-200 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100',
        variant === 'default' && 'bg-dark-bg hover:bg-dark-border text-dark-text',
        variant === 'danger' && 'bg-status-offline/20 hover:bg-status-offline/30 text-status-offline',
        variant === 'success' && 'bg-status-online/20 hover:bg-status-online/30 text-status-online',
      )}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

export function QuickActions() {
  const {
    sendNavCommand,
    sendGpsRoute,
    emergencyStop,
    isRobotOnline,
    navStatus,
  } = useMQTT();

  const mode = navStatus?.mode;
  const isAuto = mode === 'AUTO_FREE_COVERAGE' || mode === 'AUTO_LINE_FOLLOW' || mode === 'AUTO_GPS_WAYPOINT';

  return (
    <div className="grid grid-cols-2 gap-3">
      <ActionButton
        icon={<Radio className="w-6 h-6" />}
        label="Chế độ Thủ công"
        onClick={() => sendNavCommand('manual')}
        variant="success"
        disabled={!isRobotOnline}
      />
      <ActionButton
        icon={<Pause className="w-6 h-6" />}
        label="Dừng auto"
        onClick={() => {
          if (mode === 'AUTO_GPS_WAYPOINT') sendGpsRoute('stop');
          sendNavCommand('manual');
        }}
        disabled={!isRobotOnline || !isAuto}
      />
      <ActionButton
        icon={<AlertTriangle className="w-6 h-6" />}
        label="Dừng khẩn"
        onClick={() => emergencyStop()}
        variant="danger"
        disabled={!isRobotOnline}
      />
      <ActionButton
        icon={<RotateCcw className="w-6 h-6" />}
        label="Clear khẩn"
        onClick={() => sendNavCommand('clear_emergency')}
        disabled={!isRobotOnline || mode !== 'EMERGENCY'}
      />
    </div>
  );
}
