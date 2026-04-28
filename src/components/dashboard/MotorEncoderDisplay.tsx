'use client';

import { useMQTT, useRobotControl } from '@/providers/MQTTProvider';
import { cn } from '@/lib/utils';
import { MotorPosition } from '@/lib/mqtt-config';
import { 
  Cpu, 
  Activity, 
  RotateCw, 
  Gauge, 
  ArrowUp,
  ArrowDown,
  Circle,
  RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface MotorCardProps {
  position: MotorPosition;
  label: string;
  speed?: number;
  direction?: 'forward' | 'backward' | 'stopped';
  rpm?: number;
  count?: number;
  revolutions?: number;
  inverted?: boolean;
  onForward?: () => void;
  onBackward?: () => void;
  onStop?: () => void;
}

function MotorCard({ 
  position, 
  label, 
  speed = 0,
  direction = 'stopped',
  rpm = 0,
  count = 0,
  revolutions = 0,
  inverted = false,
  onForward,
  onBackward,
  onStop
}: MotorCardProps) {
  const isRunning = direction !== 'stopped' && speed > 0;
  
  return (
    <Card variant="default" className="p-3 relative overflow-hidden">
      {/* Running indicator */}
      {isRunning && (
        <div className="absolute inset-0 bg-gradient-to-r from-kpatrol-500/10 to-transparent animate-pulse" />
      )}
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold',
              isRunning 
                ? 'bg-kpatrol-500/20 text-kpatrol-400' 
                : 'bg-dark-surface text-dark-muted'
            )}>
              {position}
            </div>
            <div>
              <div className="text-sm font-medium text-dark-text">{label}</div>
              <div className="text-xs text-dark-muted">
                {inverted ? 'Inverted' : 'Normal'}
              </div>
            </div>
          </div>
          
          {/* Direction indicator */}
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs',
            direction === 'forward' && 'bg-green-500/20 text-green-400',
            direction === 'backward' && 'bg-orange-500/20 text-orange-400',
            direction === 'stopped' && 'bg-dark-surface text-dark-muted'
          )}>
            {direction === 'forward' && <ArrowUp className="w-3 h-3" />}
            {direction === 'backward' && <ArrowDown className="w-3 h-3" />}
            {direction === 'stopped' && <Circle className="w-3 h-3" />}
            {direction === 'forward' ? 'FWD' : direction === 'backward' ? 'BWD' : 'STOP'}
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="bg-dark-bg rounded-md p-2">
            <div className="flex items-center gap-1 text-xs text-dark-muted mb-1">
              <Gauge className="w-3 h-3" />
              RPM
            </div>
            <div className="text-lg font-mono font-medium text-dark-text">
              {rpm.toFixed(1)}
            </div>
          </div>
          <div className="bg-dark-bg rounded-md p-2">
            <div className="flex items-center gap-1 text-xs text-dark-muted mb-1">
              <Activity className="w-3 h-3" />
              Speed
            </div>
            <div className="text-lg font-mono font-medium text-dark-text">
              {speed}
            </div>
          </div>
        </div>
        
        {/* Encoder */}
        <div className="bg-dark-bg rounded-md p-2 mb-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-dark-muted">Encoder Count</span>
            <span className={cn(
              'font-mono',
              count > 0 ? 'text-green-400' : count < 0 ? 'text-orange-400' : 'text-dark-text'
            )}>
              {count.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-dark-muted">Revolutions</span>
            <span className="font-mono text-dark-text">{revolutions.toFixed(2)}</span>
          </div>
        </div>
        
        {/* Control buttons */}
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant={direction === 'forward' ? 'primary' : 'secondary'}
            className="flex-1 text-xs py-1"
            onClick={onForward}
          >
            <ArrowUp className="w-3 h-3" />
          </Button>
          <Button 
            size="sm" 
            variant={direction === 'stopped' ? 'danger' : 'secondary'}
            className="flex-1 text-xs py-1"
            onClick={onStop}
          >
            Stop
          </Button>
          <Button 
            size="sm" 
            variant={direction === 'backward' ? 'primary' : 'secondary'}
            className="flex-1 text-xs py-1"
            onClick={onBackward}
          >
            <ArrowDown className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function MotorEncoderDisplay() {
  const { encoders, motors, isMotorControllerOnline, isEncoderReaderOnline } = useMQTT();
  const robotControl = useRobotControl();
  
  // Motor configuration (from KPATROL_AI_CONTEXT_FULL.md)
  const motorConfig: Record<MotorPosition, { label: string; inverted: boolean }> = {
    FR: { label: 'Front-Right', inverted: false },
    FL: { label: 'Front-Left', inverted: true },
    BR: { label: 'Back-Right', inverted: false },
    BL: { label: 'Back-Left', inverted: true },
  };
  
  const getMotorData = (pos: MotorPosition) => {
    const motor = motors?.[pos];
    const encoder = encoders?.[pos];
    
    return {
      speed: motor?.speed ?? 0,
      direction: motor?.direction ?? 'stopped',
      rpm: encoder?.rpm ?? 0,
      count: encoder?.count ?? 0,
      revolutions: encoder?.revolutions ?? 0,
    };
  };
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-kpatrol-500/20 rounded-lg">
            <Cpu className="w-5 h-5 text-kpatrol-400" />
          </div>
          <div>
            <h2 className="font-semibold text-dark-text">Motors & Encoders</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={cn(
                'flex items-center gap-1 text-xs px-1.5 py-0.5 rounded',
                isMotorControllerOnline 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              )}>
                <Circle className={cn('w-1.5 h-1.5', isMotorControllerOnline && 'animate-pulse')} />
                ESP32-S3
              </div>
              <div className={cn(
                'flex items-center gap-1 text-xs px-1.5 py-0.5 rounded',
                isEncoderReaderOnline 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              )}>
                <Circle className={cn('w-1.5 h-1.5', isEncoderReaderOnline && 'animate-pulse')} />
                ESP32 Dev
              </div>
            </div>
          </div>
        </div>
        
        <Button 
          variant="secondary" 
          size="sm"
          onClick={robotControl.resetEncoders}
          className="text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Reset
        </Button>
      </div>
      
      {/* Motor Layout - Mecanum pattern */}
      <div className="relative">
        {/* Direction indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-12 h-12 rounded-full bg-dark-surface border-2 border-dark-border flex items-center justify-center">
            <ArrowUp className="w-6 h-6 text-dark-muted" />
          </div>
          <div className="text-center text-xs text-dark-muted mt-1">FRONT</div>
        </div>
        
        {/* Motor grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Front row */}
          <MotorCard 
            position="FL"
            label={motorConfig.FL.label}
            inverted={motorConfig.FL.inverted}
            {...getMotorData('FL')}
            onForward={() => robotControl.motorFL('F')}
            onBackward={() => robotControl.motorFL('B')}
            onStop={() => robotControl.motorFL('S')}
          />
          <MotorCard 
            position="FR"
            label={motorConfig.FR.label}
            inverted={motorConfig.FR.inverted}
            {...getMotorData('FR')}
            onForward={() => robotControl.motorFR('F')}
            onBackward={() => robotControl.motorFR('B')}
            onStop={() => robotControl.motorFR('S')}
          />
          
          {/* Back row */}
          <MotorCard 
            position="BL"
            label={motorConfig.BL.label}
            inverted={motorConfig.BL.inverted}
            {...getMotorData('BL')}
            onForward={() => robotControl.motorBL('F')}
            onBackward={() => robotControl.motorBL('B')}
            onStop={() => robotControl.motorBL('S')}
          />
          <MotorCard 
            position="BR"
            label={motorConfig.BR.label}
            inverted={motorConfig.BR.inverted}
            {...getMotorData('BR')}
            onForward={() => robotControl.motorBR('F')}
            onBackward={() => robotControl.motorBR('B')}
            onStop={() => robotControl.motorBR('S')}
          />
        </div>
      </div>
      
      {/* Mecanum wheel pattern visualization */}
      <Card variant="default" className="p-3">
        <div className="text-xs text-dark-muted mb-2">Mecanum Wheel Pattern (Top View)</div>
        <div className="flex justify-center">
          <div className="grid grid-cols-2 gap-6 text-center">
            <div className="text-2xl">╲</div>
            <div className="text-2xl">╱</div>
            <div className="text-2xl">╱</div>
            <div className="text-2xl">╲</div>
          </div>
        </div>
        <div className="text-center text-xs text-dark-muted mt-2">
          Rollers create X shape for omnidirectional movement
        </div>
      </Card>
    </div>
  );
}

// Compact version for dashboard
export function MotorStatusCompact() {
  const { encoders, motors, isMotorControllerOnline, isEncoderReaderOnline } = useMQTT();
  
  const positions: MotorPosition[] = ['FL', 'FR', 'BL', 'BR'];
  
  return (
    <Card variant="default" className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-dark-text">Motor Status</h3>
        <div className="flex gap-1">
          <div className={cn(
            'w-2 h-2 rounded-full',
            isMotorControllerOnline ? 'bg-green-400' : 'bg-red-400'
          )} title="ESP32-S3" />
          <div className={cn(
            'w-2 h-2 rounded-full',
            isEncoderReaderOnline ? 'bg-green-400' : 'bg-red-400'
          )} title="ESP32 Dev" />
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        {positions.map(pos => {
          const motor = motors?.[pos];
          const encoder = encoders?.[pos];
          const isRunning = motor?.direction !== 'stopped' && (motor?.speed ?? 0) > 0;
          
          return (
            <div 
              key={pos}
              className={cn(
                'text-center p-2 rounded-lg',
                isRunning ? 'bg-kpatrol-500/20' : 'bg-dark-surface'
              )}
            >
              <div className="text-xs font-bold text-dark-muted">{pos}</div>
              <div className={cn(
                'text-sm font-mono',
                isRunning ? 'text-kpatrol-400' : 'text-dark-text'
              )}>
                {(encoder?.rpm ?? 0).toFixed(0)}
              </div>
              <div className="text-xs text-dark-muted">RPM</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
