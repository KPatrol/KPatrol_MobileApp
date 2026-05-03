'use client';

import {
  Video,
  VideoOff,
  Maximize2,
  Minimize2,
  Settings,
  RefreshCw,
  Camera,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  Download,
  Share2,
  Circle,
  Square,
  Flashlight,
  WifiOff,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { STREAM_CONFIG, StreamInfo, checkStreamHealth, getStreamInfo } from '@/lib/stream-config';
import { useAppMode } from '@/providers/AppModeProvider';

type CameraQuality = '480p' | '720p' | '1080p';
type CameraMode = 'normal' | 'night' | 'thermal';

export function CameraView() {
  const { isDev } = useAppMode();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState('00:00');
  const [quality, setQuality] = useState<CameraQuality>('720p');
  const [cameraMode, setCameraMode] = useState<CameraMode>('normal');
  const [zoom, setZoom] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [useLocalStream, setUseLocalStream] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const healthCheckRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);
  const [streamKey, setStreamKey] = useState(Date.now());

  const getStreamUrl = useCallback(() => {
    const baseUrl = useLocalStream ? STREAM_CONFIG.localStreamUrl : STREAM_CONFIG.streamUrl;
    return `${baseUrl}?t=${streamKey}`;
  }, [useLocalStream, streamKey]);

  const checkHealth = useCallback(async () => {
    try {
      const start = performance.now();
      const isHealthy = await checkStreamHealth();
      const end = performance.now();
      setLatency(Math.round(end - start));

      if (!isHealthy && isConnected) {
        setStreamError('Stream không phản hồi');
      }

      const info = await getStreamInfo();
      if (info) {
        setStreamInfo(info);
      }
    } catch (err) {
      console.warn('Health check failed:', err);
    }
  }, [isConnected]);

  const connectStream = useCallback(() => {
    setIsLoading(true);
    setStreamError(null);
    setStreamKey(Date.now());
    setIsConnected(true);

    if (healthCheckRef.current) {
      clearInterval(healthCheckRef.current);
    }
    healthCheckRef.current = setInterval(checkHealth, STREAM_CONFIG.healthCheckInterval);
  }, [checkHealth]);

  const disconnectStream = useCallback(() => {
    setIsConnected(false);
    setStreamError(null);
    setStreamInfo(null);
    setLatency(null);

    if (healthCheckRef.current) {
      clearInterval(healthCheckRef.current);
      healthCheckRef.current = null;
    }
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
  }, []);

  const refreshStream = useCallback(() => {
    setStreamKey(Date.now());
  }, []);

  const handleStreamError = useCallback(() => {
    setStreamError('Stream bị gián đoạn');

    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
    }
    reconnectRef.current = setTimeout(() => {
      if (isConnected) {
        refreshStream();
      }
    }, STREAM_CONFIG.reconnectInterval);
  }, [isConnected, refreshStream]);

  const handleStreamLoad = useCallback(() => {
    setStreamError(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isRecording) {
      setRecordingTime('00:00');
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const ss = String(elapsed % 60).padStart(2, '0');
      setRecordingTime(`${mm}:${ss}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    // Auto-connect on first mount — mirror ControlView CameraPanel UX.
    setStreamKey(Date.now());
    setIsConnected(true);
    setIsLoading(true);
    setStreamError(null);
    healthCheckRef.current = setInterval(checkHealth, STREAM_CONFIG.healthCheckInterval);

    return () => {
      if (healthCheckRef.current) {
        clearInterval(healthCheckRef.current);
      }
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.();
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom((prev) => {
      if (direction === 'in') return Math.min(prev + 0.25, 3);
      return Math.max(prev - 0.25, 1);
    });
  };

  const handleSnapshot = async () => {
    if (!isConnected) return;

    try {
      const snapshotUrl = useLocalStream ? STREAM_CONFIG.localSnapshotUrl : STREAM_CONFIG.snapshotUrl;
      const response = await fetch(`${snapshotUrl}?t=${Date.now()}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.download = `kpatrol-snapshot-${Date.now()}.jpg`;
        link.href = url;
        link.click();

        URL.revokeObjectURL(url);
      } else {
        if (imgRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = imgRef.current.naturalWidth || 1280;
          canvas.height = imgRef.current.naturalHeight || 720;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            ctx.drawImage(imgRef.current, 0, 0);
            const link = document.createElement('a');
            link.download = `kpatrol-snapshot-${Date.now()}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.click();
          }
        }
      }
    } catch (err) {
      console.warn('Snapshot failed:', err);
    }
  };

  const openStreamInNewTab = () => {
    window.open(STREAM_CONFIG.streamUrl, '_blank');
  };

  const liveOk = isConnected && !streamError;

  return (
    <div
      ref={containerRef}
      className={cn(
        'h-full flex flex-col gap-3 md:gap-4 min-h-0',
        isFullscreen && 'fixed inset-0 z-50 bg-slate-950 p-4'
      )}
    >
      {/* HUD Camera Frame */}
      <div className="relative flex-1 min-h-[300px] overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 border border-cyan-500/30 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent z-20" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent z-20" />

        {/* Stream Feed */}
        {isConnected ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
            <img
              ref={imgRef}
              src={getStreamUrl()}
              alt="Camera Stream"
              className="w-full h-full object-contain transition-transform"
              style={{ transform: `scale(${zoom})` }}
              onError={handleStreamError}
              onLoad={handleStreamLoad}
            />

            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
                <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
              </div>
            )}

            {streamError && !isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                <div className="p-3 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/40 shadow-[0_0_24px_rgba(245,158,11,0.3)] mb-3">
                  <AlertCircle className="w-8 h-8 text-amber-300" />
                </div>
                <p className="text-amber-200 font-bold uppercase tracking-wider text-sm">{streamError}</p>
                <button
                  onClick={refreshStream}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/40 text-cyan-300 font-bold uppercase tracking-wider text-xs hover:bg-cyan-500/20 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Thử lại
                </button>
              </div>
            )}

            {cameraMode === 'night' && (
              <div className="absolute inset-0 bg-emerald-900/30 mix-blend-multiply pointer-events-none" />
            )}
            {cameraMode === 'thermal' && (
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-red-500/20 to-purple-500/20 mix-blend-multiply pointer-events-none" />
            )}

            {/* Corner markers (HUD reticle) */}
            <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-cyan-400/60 pointer-events-none" />
            <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-cyan-400/60 pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-cyan-400/60 pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-cyan-400/60 pointer-events-none" />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-950">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-3xl bg-slate-900/80 ring-1 ring-slate-700/60 flex items-center justify-center">
                {isLoading ? (
                  <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
                ) : (
                  <VideoOff className="w-10 h-10 text-slate-500" />
                )}
              </div>
              {!isLoading && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-red-500/80 ring-2 ring-slate-950 flex items-center justify-center shadow-[0_0_18px_rgba(239,68,68,0.4)]">
                  <WifiOff className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <p className="text-[10px] uppercase tracking-widest text-cyan-400/80 font-bold mb-1">
              Camera Feed
            </p>
            <p className="text-base font-bold text-white">
              {isLoading ? 'Đang kết nối...' : 'Camera chưa kết nối'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {isLoading ? 'Vui lòng chờ...' : 'Nhấn nút bên dưới để kết nối stream'}
            </p>
            {streamError && !isLoading && (
              <p className="text-sm text-amber-300 mt-2 font-mono">{streamError}</p>
            )}
          </div>
        )}

        {/* Top Overlay HUD pills */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold ring-1 backdrop-blur-md',
                liveOk
                  ? 'text-red-300 bg-red-500/15 ring-red-500/40 shadow-[0_0_18px_rgba(239,68,68,0.25)]'
                  : streamError
                  ? 'text-amber-300 bg-amber-500/10 ring-amber-500/40'
                  : 'text-slate-400 bg-slate-900/80 ring-slate-700/60'
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  liveOk ? 'bg-red-400 animate-pulse' : streamError ? 'bg-amber-400' : 'bg-slate-500'
                )}
              />
              {liveOk ? 'LIVE' : streamError ? 'Lỗi' : 'Offline'}
            </div>

            {isConnected && (
              <>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold ring-1 text-cyan-300 bg-slate-900/80 ring-cyan-500/40 backdrop-blur-md font-mono">
                  {quality}
                </span>
                {isDev && latency && (
                  <span
                    className={cn(
                      'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold ring-1 backdrop-blur-md font-mono tabular-nums',
                      latency < 100
                        ? 'text-emerald-300 bg-slate-900/80 ring-emerald-500/40'
                        : latency < 200
                        ? 'text-amber-300 bg-slate-900/80 ring-amber-500/40'
                        : 'text-red-300 bg-slate-900/80 ring-red-500/40'
                    )}
                  >
                    {latency}ms
                  </span>
                )}
                {isDev && useLocalStream && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold ring-1 text-purple-300 bg-slate-900/80 ring-purple-500/40 backdrop-blur-md">
                    Local
                  </span>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isConnected && (
              <>
                <button
                  onClick={openStreamInNewTab}
                  className="p-2 rounded-xl bg-slate-900/80 ring-1 ring-slate-700/60 text-slate-300 backdrop-blur-md hover:text-cyan-300 hover:ring-cyan-500/40 transition-all"
                  title="Mở stream trong tab mới"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={cn(
                    'p-2 rounded-xl backdrop-blur-md transition-all ring-1',
                    showSettings
                      ? 'bg-cyan-500/15 ring-cyan-500/50 text-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.3)]'
                      : 'bg-slate-900/80 ring-slate-700/60 text-slate-300 hover:text-cyan-300 hover:ring-cyan-500/40'
                  )}
                >
                  <Settings className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={handleFullscreen}
              className="p-2 rounded-xl bg-slate-900/80 ring-1 ring-slate-700/60 text-slate-300 backdrop-blur-md hover:text-cyan-300 hover:ring-cyan-500/40 transition-all"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Bottom Overlay HUD pills */}
        {isConnected && (
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between z-10">
            <div className="flex items-center gap-2">
              {isRecording && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 ring-1 ring-red-500/60 text-red-100 font-bold backdrop-blur-md shadow-[0_0_18px_rgba(239,68,68,0.35)] animate-pulse">
                  <Circle className="w-3 h-3 fill-red-400 text-red-400" />
                  <span className="text-xs uppercase tracking-widest">REC</span>
                  <span className="text-xs font-mono tabular-nums text-red-200">{recordingTime}</span>
                </div>
              )}
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 ring-1 ring-slate-700/60 backdrop-blur-md">
              <button
                onClick={() => handleZoom('out')}
                disabled={zoom <= 1}
                className="p-1 rounded-lg text-slate-300 hover:text-cyan-300 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono tabular-nums font-bold min-w-[40px] text-center text-cyan-300">
                {zoom.toFixed(1)}x
              </span>
              <button
                onClick={() => handleZoom('in')}
                disabled={zoom >= 3}
                className="p-1 rounded-lg text-slate-300 hover:text-cyan-300 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSnapshot}
                className="p-2 rounded-xl bg-slate-900/80 ring-1 ring-slate-700/60 text-slate-300 backdrop-blur-md hover:text-cyan-300 hover:ring-cyan-500/40 transition-all"
                title="Chụp ảnh"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && isConnected && (
          <div className="absolute top-14 right-3 w-64 z-20 overflow-hidden rounded-2xl bg-slate-900/95 backdrop-blur-md border border-cyan-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
            <div className="relative p-4">
              <p className="text-[10px] uppercase tracking-widest text-cyan-400/80 font-bold mb-1">
                Cấu hình
              </p>
              <h4 className="text-sm font-bold text-white mb-3">Cài đặt Camera</h4>

              {/* Quality */}
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">
                  Chất lượng
                </p>
                <div className="flex gap-2">
                  {(['480p', '720p', '1080p'] as CameraQuality[]).map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className={cn(
                        'flex-1 py-1.5 text-[10px] rounded-lg font-bold uppercase tracking-wider transition-all ring-1',
                        quality === q
                          ? 'bg-cyan-500/20 ring-cyan-500/50 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                          : 'bg-slate-950/60 ring-slate-700/60 text-slate-400 hover:text-slate-200 hover:ring-slate-600'
                      )}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode */}
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">
                  Chế độ hiển thị
                </p>
                <div className="flex gap-2">
                  <ModeBtn
                    active={cameraMode === 'normal'}
                    onClick={() => setCameraMode('normal')}
                    icon={Sun}
                    label="Thường"
                    tone="cyan"
                  />
                  <ModeBtn
                    active={cameraMode === 'night'}
                    onClick={() => setCameraMode('night')}
                    icon={Moon}
                    label="Đêm"
                    tone="emerald"
                  />
                  <ModeBtn
                    active={cameraMode === 'thermal'}
                    onClick={() => setCameraMode('thermal')}
                    icon={Flashlight}
                    label="Nhiệt"
                    tone="amber"
                  />
                </div>
              </div>

              {/* Stream Source */}
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">
                  Nguồn Stream
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setUseLocalStream(false);
                      refreshStream();
                    }}
                    className={cn(
                      'flex-1 py-1.5 text-[10px] rounded-lg font-bold uppercase tracking-wider transition-all ring-1',
                      !useLocalStream
                        ? 'bg-cyan-500/20 ring-cyan-500/50 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                        : 'bg-slate-950/60 ring-slate-700/60 text-slate-400 hover:text-slate-200 hover:ring-slate-600'
                    )}
                  >
                    Public
                  </button>
                  <button
                    onClick={() => {
                      setUseLocalStream(true);
                      refreshStream();
                    }}
                    className={cn(
                      'flex-1 py-1.5 text-[10px] rounded-lg font-bold uppercase tracking-wider transition-all ring-1',
                      useLocalStream
                        ? 'bg-purple-500/20 ring-purple-500/50 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                        : 'bg-slate-950/60 ring-slate-700/60 text-slate-400 hover:text-slate-200 hover:ring-slate-600'
                    )}
                  >
                    Local
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Camera Controls */}
      <div className="grid grid-cols-2 gap-3 shrink-0">
        <button
          onClick={isConnected ? disconnectStream : connectStream}
          disabled={isLoading}
          className={cn(
            'inline-flex items-center justify-center gap-2 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-all',
            isConnected
              ? 'bg-red-500/10 ring-1 ring-red-500/40 text-red-300 hover:bg-red-500/20 hover:ring-red-500/60 hover:shadow-[0_0_24px_rgba(239,68,68,0.3)]'
              : 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-[0_0_24px_rgba(34,211,238,0.35)] hover:shadow-[0_0_32px_rgba(34,211,238,0.5)]',
            'disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang kết nối...
            </>
          ) : isConnected ? (
            <>
              <VideoOff className="w-5 h-5" />
              Ngắt kết nối
            </>
          ) : (
            <>
              <Video className="w-5 h-5" />
              Kết nối Camera
            </>
          )}
        </button>

        <button
          onClick={refreshStream}
          disabled={!isConnected || isLoading}
          className="inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800/60 ring-1 ring-slate-700/60 text-slate-200 font-bold uppercase tracking-wider text-sm hover:bg-slate-700/60 hover:ring-cyan-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <RefreshCw className="w-5 h-5" />
          Làm mới
        </button>
      </div>

      {/* Recording Controls */}
      {isConnected && (
        <div className="grid grid-cols-4 gap-3 shrink-0">
          <button
            onClick={() => setIsRecording(!isRecording)}
            title={isRecording ? 'Dừng ghi' : 'Bắt đầu ghi'}
            className={cn(
              'inline-flex items-center justify-center py-3 rounded-xl ring-1 transition-all',
              isRecording
                ? 'bg-red-500/15 ring-red-500/50 text-red-300 shadow-[0_0_18px_rgba(239,68,68,0.3)] hover:bg-red-500/25'
                : 'bg-slate-800/60 ring-slate-700/60 text-slate-200 hover:bg-slate-700/60 hover:ring-red-500/40'
            )}
          >
            {isRecording ? <Square className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
          </button>
          <button
            onClick={handleSnapshot}
            title="Chụp ảnh"
            className="inline-flex items-center justify-center py-3 rounded-xl bg-slate-800/60 ring-1 ring-slate-700/60 text-slate-200 hover:bg-slate-700/60 hover:ring-cyan-500/40 transition-all"
          >
            <Camera className="w-4 h-4" />
          </button>
          <button
            title="Tải xuống"
            className="inline-flex items-center justify-center py-3 rounded-xl bg-slate-800/60 ring-1 ring-slate-700/60 text-slate-200 hover:bg-slate-700/60 hover:ring-cyan-500/40 transition-all"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            title="Chia sẻ"
            className="inline-flex items-center justify-center py-3 rounded-xl bg-slate-800/60 ring-1 ring-slate-700/60 text-slate-200 hover:bg-slate-700/60 hover:ring-cyan-500/40 transition-all"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Camera Info — dev only */}
      {isDev && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 border border-slate-700/40 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.5)] shrink-0">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
          <div className="relative p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/40 shadow-[0_0_18px_rgba(34,211,238,0.25)]">
                  <Camera className="w-4 h-4 text-cyan-300" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-cyan-400/80 font-bold">
                    Telemetry
                  </p>
                  <h3 className="font-bold text-white uppercase tracking-wider text-sm">
                    Thông tin Camera
                  </h3>
                </div>
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold ring-1',
                  liveOk
                    ? 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/40'
                    : 'text-slate-400 bg-slate-500/10 ring-slate-500/40'
                )}
              >
                <span
                  className={cn(
                    'w-1 h-1 rounded-full',
                    liveOk ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  )}
                />
                {liveOk ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <InfoTile label="Stream URL" value={useLocalStream ? 'Local Pi' : 'stream.khoavd.online'} mono />
              <InfoTile label="FPS" value={String(streamInfo?.fps ?? 30)} mono />
              <InfoTile
                label="Độ trễ"
                value={isConnected && latency ? `~${latency}ms` : '--'}
                mono
                tone={isConnected ? (latency && latency < 150 ? 'emerald' : 'amber') : 'slate'}
              />
              <InfoTile label="Protocol" value={streamInfo?.protocol ?? 'MJPEG'} mono />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  icon: Icon,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  tone: 'cyan' | 'emerald' | 'amber';
}) {
  const t = {
    cyan: 'bg-cyan-500/20 ring-cyan-500/50 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.3)]',
    emerald: 'bg-emerald-500/20 ring-emerald-500/50 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3)]',
    amber: 'bg-amber-500/20 ring-amber-500/50 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)]',
  }[tone];
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 py-2 rounded-lg flex flex-col items-center gap-1 transition-all ring-1',
        active ? t : 'bg-slate-950/60 ring-slate-700/60 text-slate-400 hover:text-slate-200 hover:ring-slate-600'
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[10px] uppercase tracking-wider font-bold">{label}</span>
    </button>
  );
}

function InfoTile({
  label,
  value,
  mono,
  tone = 'slate',
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: 'slate' | 'emerald' | 'amber';
}) {
  const valueTone =
    tone === 'emerald' ? 'text-emerald-300' : tone === 'amber' ? 'text-amber-300' : 'text-slate-200';
  return (
    <div className="p-2.5 rounded-xl bg-slate-950/60 ring-1 ring-slate-700/60">
      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">{label}</p>
      <p className={cn('text-sm font-bold truncate', valueTone, mono && 'font-mono tabular-nums')}>
        {value}
      </p>
    </div>
  );
}
