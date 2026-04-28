'use client';

import {
  RotateCcw,
  AlertTriangle,
  Play,
  Pause,
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
    sendScriptCommand,
    emergencyStop,
    isRobotOnline,
    navStatus,
  } = useMQTT();

  const isPatrolling = navStatus?.state === 'running' || navStatus?.mode === 'SCRIPT_PATROL';

  return (
    <div className="grid grid-cols-2 gap-3">
      <ActionButton
        icon={<Play className="w-6 h-6" />}
        label="Tiếp tục script"
        onClick={() => sendScriptCommand('start')}
        variant="success"
        disabled={!isRobotOnline || isPatrolling}
      />
      <ActionButton
        icon={<Pause className="w-6 h-6" />}
        label="Dừng patrol"
        onClick={() => {
          sendScriptCommand('stop');
          sendNavCommand('MANUAL');
        }}
        disabled={!isRobotOnline}
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
        onClick={() => sendNavCommand('MANUAL', { action: 'clear_emergency' })}
        disabled={!isRobotOnline}
      />
    </div>
  );
}
