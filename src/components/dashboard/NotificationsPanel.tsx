'use client';

import React from 'react';
import { Bell, Bug, UserPlus, CheckCircle, Edit, Trash2 } from 'lucide-react';

interface Notification {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  message: string;
  time: string;
}

interface Activity {
  id: string;
  color: string;
  title: string;
  time: string;
}

interface Contact {
  id: string;
  name: string;
  color: string;
}

const demoNotifications: Notification[] = [
  { id: '1', icon: Bug, iconColor: 'text-purple-500', message: 'You have a bug that needs...', time: 'Just now' },
  { id: '2', icon: UserPlus, iconColor: 'text-blue-500', message: 'New user registered', time: '59 minutes ago' },
  { id: '3', icon: Bug, iconColor: 'text-purple-500', message: 'You have a bug that needs...', time: '12 hours ago' },
  { id: '4', icon: CheckCircle, iconColor: 'text-green-500', message: 'Andi Lane subscribed to you', time: 'Today, 11:59 AM' },
];

const demoActivities: Activity[] = [
  { id: '1', color: 'bg-green-400', title: 'You have a bug that needs...', time: 'Just now' },
  { id: '2', color: 'bg-blue-400', title: 'Released a new version', time: '59 minutes ago' },
  { id: '3', color: 'bg-cyan-400', title: 'Submitted a bug', time: '12 hours ago' },
  { id: '4', color: 'bg-pink-400', title: 'Modified A data in Page X', time: 'Today, 11:59 AM' },
  { id: '5', color: 'bg-gray-600', title: 'Deleted a page in Project X', time: 'Feb 2, 2023' },
];

const demoContacts: Contact[] = [
  { id: '1', name: 'NC', color: 'bg-gray-300' },
  { id: '2', name: 'DC', color: 'bg-red-500' },
  { id: '3', name: 'OD', color: 'bg-yellow-400' },
  { id: '4', name: 'AL', color: 'bg-orange-400' },
];

export function NotificationsPanel() {
  return (
    <div className="notifications-panel">
      {/* Notifications */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
          Notifications
        </h3>
        <div className="space-y-0">
          {demoNotifications.map(notif => (
            <div key={notif.id} className="notification-item">
              <notif.icon className={`w-4 h-4 ${notif.iconColor} flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-text-primary)] truncate">
                  {notif.message}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">{notif.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activities */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
          Activities
        </h3>
        <div className="space-y-0">
          {demoActivities.map(activity => (
            <div key={activity.id} className="notification-item">
              <div className={`activity-dot ${activity.color} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-text-primary)] truncate">
                  {activity.title}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contacts */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
          Contacts
        </h3>
        <div className="space-y-2">
          {demoContacts.map(contact => (
            <div key={contact.id} className="flex items-center gap-3">
              <div className={`avatar ${contact.color} text-white`}>
                {contact.name}
              </div>
              <span className="text-sm text-[var(--color-text-primary)]">
                {contact.name === 'NC' ? 'Natali Craig' :
                 contact.name === 'DC' ? 'Drew Cano' :
                 contact.name === 'OD' ? 'Orlando Diggs' : 'Andi Lane'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default NotificationsPanel;
