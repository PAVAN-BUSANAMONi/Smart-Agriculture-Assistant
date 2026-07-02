import { BellDot, ShieldCheck } from 'lucide-react';
import {
  NotificationCardShell,
  NotificationDismissButton,
  NotificationFooter,
  NotificationReadButton,
} from './shared';
import type { NotificationCardProps } from './types';

function getSystemTitle(title: string) {
  return title.trim() || 'System notice';
}

function getSystemMessage(message: string, title: string) {
  return message.trim() || title.trim() || 'A new system update is available.';
}

export function SystemNotice({ item, onOpen, onDismiss, onRead }: NotificationCardProps) {
  return (
    <NotificationCardShell
      onOpen={onOpen}
      className="rounded-[22px] border border-[#d7deeb] bg-[linear-gradient(180deg,#ffffff,#f3f6fb)] px-4 py-3.5 text-slate-900 shadow-[0_18px_34px_rgba(102,120,146,0.14)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,138,185,0.12),transparent_34%)]" />

      <div className="relative flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,#edf3ff,#dfe7f3)] shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
          <BellDot size={28} className="text-[#4b6b93]" strokeWidth={2.1} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-[13px] text-slate-600">
              <ShieldCheck size={14} className="text-slate-500" />
              <span className="font-medium">Farm Desk</span>
            </div>

            <div className="flex items-center gap-2">
              <NotificationReadButton
                onClick={onRead}
                read={item.read}
                className={
                  item.read
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }
              />
              <NotificationDismissButton onClick={onDismiss} light className="border-slate-200 bg-white text-slate-500" />
            </div>
          </div>

          <div className="mt-3 rounded-[18px] border border-white/70 bg-white/80 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            <p className="text-[15px] font-black leading-6 text-slate-900">{getSystemTitle(item.title)}</p>
            <p className="mt-1.5 text-[14px] leading-6 text-slate-600">{getSystemMessage(item.message, item.title)}</p>
          </div>

          <NotificationFooter createdAt={item.createdAt} onRead={onRead} read={item.read} light />
        </div>
      </div>
    </NotificationCardShell>
  );
}
