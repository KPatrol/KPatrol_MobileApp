'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { DashboardView } from '@/components/views/DashboardView';
import { ControlView } from '@/components/views/ControlView';
import { CameraView } from '@/components/views/CameraView';
import { PatrolView } from '@/components/views/PatrolView';
import { AlertView } from '@/components/views/AlertView';
import { HistoryView } from '@/components/views/HistoryView';
import { SettingsView } from '@/components/views/SettingsView';
import { useRobotContext } from '@/providers/RobotProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { Loader2 } from 'lucide-react';

type ViewType = 'dashboard' | 'control' | 'camera' | 'patrol' | 'alerts' | 'history' | 'settings';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthContext();
  const { selectedRobot, isLoading: robotsLoading } = useRobotContext();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth gate: unauthenticated → /login (covers the case where middleware cookie
  // survived but token verification failed on this session).
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Redirect to robot selector if authenticated but no robot is selected
  useEffect(() => {
    if (!authLoading && isAuthenticated && !robotsLoading && !selectedRobot) {
      router.replace('/robots');
    }
  }, [authLoading, isAuthenticated, selectedRobot, robotsLoading, router]);

  if (authLoading || !isAuthenticated || robotsLoading || !selectedRobot) {
    return (
      <div className="flex h-screen bg-dark-bg items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'control':
        return <ControlView />;
      case 'camera':
        return <CameraView />;
      case 'patrol':
        return <PatrolView />;
      case 'alerts':
        return <AlertView />;
      case 'history':
        return <HistoryView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-dark-bg overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onMenuClick={() => setSidebarOpen(true)}
          title={getViewTitle(currentView)}
        />
        
        <main className="flex-1 overflow-hidden p-3 md:p-4 lg:p-6 min-h-0">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

function getViewTitle(view: ViewType): string {
  const titles: Record<ViewType, string> = {
    dashboard: 'Dashboard',
    control: 'Điều khiển',
    camera: 'Camera',
    patrol: 'Bản đồ & Tuần tra',
    alerts: 'Cảnh báo AI',
    history: 'Lịch sử',
    settings: 'Cài đặt',
  };
  return titles[view];
}
