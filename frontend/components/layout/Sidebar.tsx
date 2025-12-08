'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/helpers';

const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'Requests', href: '/requests' },
  { name: 'Connections', href: '/connections' },
  { name: 'Knowledge Base', href: '/knowledge-base' },
];

import { SystemStatus } from './SystemStatus';

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Logo/Header */}
      <div className="px-6 py-5 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">DataOps Agent</h1>
        <p className="text-xs text-gray-500 mt-1">JIRA Automation Platform</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'block px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700 pl-[8px]'
                    : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent pl-[8px]'
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Quick Stats */}
      <SystemStatus />
    </aside>
  );
}
