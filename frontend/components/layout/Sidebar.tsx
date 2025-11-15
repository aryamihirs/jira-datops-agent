'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/helpers';

const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'Requests', href: '/requests' },
  { name: 'Connections', href: '/connections' },
];

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
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs font-medium text-gray-500 mb-3">System Status</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Pending Requests</span>
            <span className="text-xs font-semibold text-gray-900 bg-amber-100 px-2 py-0.5 rounded">23</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">System Status</span>
            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded">Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
