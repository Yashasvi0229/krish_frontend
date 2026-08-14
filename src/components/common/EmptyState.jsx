import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-slate-100 p-4 mb-4">
        <Icon className="h-8 w-8 text-slate-400" aria-hidden />
      </div>
      {title && (
        <h3 className="text-h3 text-slate-900 mb-1">{title}</h3>
      )}
      {message && (
        <p className="text-body text-slate-500 max-w-md mb-4">{message}</p>
      )}
      {action}
    </div>
  );
}
