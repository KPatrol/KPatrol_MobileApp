'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Plus, Wifi, Battery, Clock, ChevronRight, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { useRobotContext } from '@/providers/RobotProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { Robot, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function RobotsPage() {
  const router = useRouter();
  const { user, logout } = useAuthContext();
  const { robots, isLoading, selectedRobot, selectRobot, refreshRobots, createRobot, removeRobot } = useRobotContext();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSelect = (robot: Robot) => {
    selectRobot(robot);
    router.push('/');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSerial.trim()) {
      setCreateError('Tên và mã serial là bắt buộc');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await createRobot({ name: newName.trim(), serialNumber: newSerial.trim(), description: newDesc.trim() || undefined });
      setShowCreate(false);
      setNewName(''); setNewSerial(''); setNewDesc('');
    } catch (err) {
      if (err instanceof ApiError) {
        setCreateError(err.message);
      } else {
        setCreateError('Không thể kết nối tới máy chủ. Vui lòng thử lại.');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa robot này? Hành động không thể hoàn tác.')) return;
    setDeletingId(id);
    await removeRobot(id);
    setDeletingId(null);
  };

  const statusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'online': return 'text-green-400';
      case 'offline': return 'text-gray-500';
      case 'error': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm">K-Patrol</h1>
            <p className="text-dark-muted text-xs">{user?.name ?? user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="text-dark-muted hover:text-white text-sm transition-colors"
        >
          Đăng xuất
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <h2 className="text-white text-xl font-bold">Chọn Robot</h2>
          <p className="text-dark-muted text-sm mt-1">Chọn robot bạn muốn điều khiển</p>
        </div>

        {/* Robot List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : robots.length === 0 ? (
          <div className="text-center py-16">
            <Bot className="w-12 h-12 text-dark-muted mx-auto mb-3" />
            <p className="text-dark-muted">Chưa có robot nào. Hãy thêm robot mới.</p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {robots.map((robot) => (
              <div
                key={robot.id}
                className={cn(
                  'group relative rounded-xl border bg-dark-surface transition-all',
                  selectedRobot?.id === robot.id
                    ? 'border-primary/60 ring-1 ring-primary/30'
                    : 'border-dark-border hover:border-dark-muted',
                )}
              >
                <button
                  onClick={() => handleSelect(robot)}
                  className="w-full p-4 flex items-center gap-4 text-left"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-6 h-6 text-primary" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium truncate">{robot.name}</span>
                      <span className={cn('text-xs font-medium', statusColor(robot.status))}>
                        ● {robot.status ?? 'unknown'}
                      </span>
                    </div>
                    <p className="text-dark-muted text-xs mt-0.5 font-mono">{robot.serialNumber}</p>
                    {robot.lastSeen && (
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-dark-muted" />
                        <span className="text-xs text-dark-muted">
                          {new Date(robot.lastSeen).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Battery + arrow */}
                  <div className="flex items-center gap-3 shrink-0">
                    {robot.batteryLevel != null && (
                      <div className="flex items-center gap-1">
                        <Battery className={cn(
                          'w-4 h-4',
                          robot.batteryLevel > 50 ? 'text-green-400' :
                          robot.batteryLevel > 20 ? 'text-yellow-400' : 'text-red-400'
                        )} />
                        <span className="text-xs text-dark-muted">{robot.batteryLevel}%</span>
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-dark-muted" />
                  </div>
                </button>

                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(robot.id); }}
                  className="absolute top-3 right-10 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20"
                  title="Xóa robot"
                >
                  {deletingId === robot.id ? (
                    <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-red-400" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Robot */}
        {showCreate ? (
          <form onSubmit={handleCreate} className="rounded-xl border border-dark-border bg-dark-surface p-5 space-y-4">
            <h3 className="text-white font-semibold">Thêm Robot Mới</h3>

            <div>
              <label className="block text-dark-muted text-xs mb-1">Tên robot *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="VD: K-Patrol #1"
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-dark-muted text-xs mb-1">Mã Serial *</label>
              <input
                type="text"
                value={newSerial}
                onChange={(e) => setNewSerial(e.target.value.toUpperCase())}
                placeholder="VD: KPATROL-001"
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-dark-muted text-xs mb-1">Mô tả</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Tùy chọn"
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>

            {createError && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {createError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowCreate(false); setCreateError(''); }}
                className="flex-1 py-2 rounded-lg border border-dark-border text-dark-muted hover:text-white text-sm transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary/80 text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Thêm Robot
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-3 rounded-xl border border-dashed border-dark-border hover:border-primary/50 text-dark-muted hover:text-white flex items-center justify-center gap-2 transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            Thêm Robot Mới
          </button>
        )}

        {/* Refresh */}
        <div className="mt-4 text-center">
          <button
            onClick={refreshRobots}
            className="text-dark-muted hover:text-white text-xs transition-colors flex items-center gap-1 mx-auto"
          >
            <Wifi className="w-3 h-3" />
            Làm mới danh sách
          </button>
        </div>
      </main>
    </div>
  );
}
