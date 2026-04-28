'use client';

import { useMQTT } from '@/providers/MQTTProvider';
import { cn } from '@/lib/utils';
import { MotorPosition } from '@/lib/mqtt-config';
import { ArrowUp, ArrowDown, Circle } from 'lucide-react';

export function MotorStatus() {
  const { motors, encoders, isMotorControllerOnline, isEncoderReaderOnline } = useMQTT();

  const motorList: { id: MotorPosition; label: string; pos: string }[] = [
    { id: 'FL', label: 'Trước Trái', pos: 'top-8 left-2' },
    { id: 'FR', label: 'Trước Phải', pos: 'top-8 right-2' },
    { id: 'BL', label: 'Sau Trái', pos: 'bottom-8 left-2' },
    { id: 'BR', label: 'Sau Phải', pos: 'bottom-8 right-2' },
  ];

  return (
    <div className="space-y-4">
      {/* Robot Visualization */}
      <div className="relative w-48 h-48 mx-auto">
        {/* Robot body */}
        <div className="absolute inset-4 border-2 border-dark-border rounded-lg bg-dark-bg/50" />
        
        {/* Direction indicator */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-kpatrol-500" />
        
        {/* Status indicators */}
        <div className="absolute top-4 right-4 flex flex-col gap-1">
          <div className={cn(
            'w-2 h-2 rounded-full',
            isMotorControllerOnline ? 'bg-green-400' : 'bg-red-400'
          )} title="ESP32-S3 Motor" />
          <div className={cn(
            'w-2 h-2 rounded-full',
            isEncoderReaderOnline ? 'bg-green-400' : 'bg-orange-400'
          )} title="ESP32 Encoder" />
        </div>
        
        {/* Wheels with real data */}
        {motorList.map((item) => {
          const motor = motors?.[item.id];
          const encoder = encoders?.[item.id];
          const isRunning = motor?.direction !== 'stopped' && (motor?.speed ?? 0) > 0;
          const isForward = motor?.direction === 'forward';
          const isBackward = motor?.direction === 'backward';
          
          return (
            <div
              key={item.id}
              className={cn(
                'absolute w-6 h-12 rounded-md transition-colors duration-200 flex items-center justify-center',
                item.pos,
                isForward ? 'bg-status-online' :
                isBackward ? 'bg-status-warning' :
                'bg-dark-border'
              )}
              title={`${item.label}: ${encoder?.rpm?.toFixed(0) ?? 0} RPM`}
            >
              {isForward && <ArrowUp className="w-3 h-3 text-white animate-pulse" />}
              {isBackward && <ArrowDown className="w-3 h-3 text-white animate-pulse" />}
            </div>
          );
        })}
      </div>

      {/* Motor Values with real MQTT data */}
      <div className="grid grid-cols-2 gap-3">
        {motorList.map((item) => {
          const motor = motors?.[item.id];
          const encoder = encoders?.[item.id];
          const speed = motor?.speed ?? 0;
          const rpm = encoder?.rpm ?? 0;
          const direction = motor?.direction ?? 'stopped';
          const isRunning = direction !== 'stopped' && speed > 0;
          
          return (
            <div key={item.id} className={cn(
              "bg-dark-bg rounded-lg p-3 transition-all",
              isRunning && "ring-1 ring-kpatrol-500/50"
            )}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-dark-muted">{item.id}</span>
                <span className="text-xs text-dark-muted">{item.label}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  'text-lg font-mono font-bold',
                  direction === 'forward' ? 'text-status-online' :
                  direction === 'backward' ? 'text-status-warning' :
                  'text-dark-muted'
                )}>
                  {speed}
                </span>
                <div className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
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
              {/* RPM from encoder */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-dark-muted">RPM:</span>
                <span className={cn(
                  "font-mono",
                  rpm > 0 ? "text-kpatrol-400" : "text-dark-muted"
                )}>{rpm.toFixed(1)}</span>
              </div>
              {/* Speed bar */}
              <div className="w-full h-1.5 bg-dark-border rounded-full overflow-hidden mt-2">
                <div 
                  className={cn(
                    'h-full transition-all duration-200',
                    direction === 'forward' ? 'bg-status-online' : 
                    direction === 'backward' ? 'bg-status-warning' : 
                    'bg-dark-border'
                  )}
                  style={{ width: `${(speed / 255) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
