import { formatDateLong, formatDateShort, isDeadlinePassed, toIsoDate } from '@/lib/text/dates';
import { cn } from '@/lib/utils';

interface DeadlineStatusProps {
  /** ISO date of the last application day. */
  deadlineAt: string;
  /** Secondary detail such as the exam date and number of posts (records.deadline_note). */
  note?: string | null;
  /**
   * `row`    — the list row: one quiet line under the summary
   * `detail` — the record page: a bordered block under the meta bar
   */
  variant?: 'row' | 'detail';
  className?: string;
}

/**
 * The application deadline, in the two places it is shown.
 *
 * It replaced a highlighter-yellow bar on the list row, which read as a warning
 * on every open notice and as nothing at all on a closed one. The state is now a
 * dot and a word — filled and teal while applications are open, hollow and grey
 * once they have closed — with the date beside it in plain text, so the row stays
 * quiet and the one thing that changes between rows is easy to find.
 *
 * "Open" is decided at RENDER time, and the pages are cached for up to an hour,
 * so a notice can read "açık" for that long after its last day. The date is
 * printed beside the word for exactly that reason.
 */
export function DeadlineStatus({ deadlineAt, note, variant = 'row', className }: DeadlineStatusProps) {
  const closed = isDeadlinePassed(deadlineAt);
  const state = closed ? 'Süresi doldu' : 'Başvuru açık';

  if (variant === 'detail') {
    return (
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-5 gap-y-2 rounded border border-line border-l-[3px] bg-surface-muted px-4 py-3',
          closed ? 'border-l-line-strong' : 'border-l-accent',
          className,
        )}
      >
        <StateLabel closed={closed} className="text-base">
          {state}
        </StateLabel>
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-ink-muted">Son başvuru günü</span>
          <time dateTime={toIsoDate(deadlineAt)} className="text-xl font-semibold text-ink">
            {formatDateLong(deadlineAt)}
          </time>
        </div>
        {note ? <span className="w-full text-sm text-ink-muted sm:w-auto">{note}</span> : null}
      </div>
    );
  }

  return (
    <span className={cn('flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm', className)}>
      <StateLabel closed={closed}>{state}</StateLabel>
      <span aria-hidden className="text-ink-placeholder">
        ·
      </span>
      <span className="text-ink-muted">
        {closed ? 'Son gün ' : 'Son başvuru '}
        <time dateTime={toIsoDate(deadlineAt)}>{formatDateShort(deadlineAt)}</time>
      </span>
    </span>
  );
}

function StateLabel({
  closed,
  className,
  children,
}: {
  closed: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold',
        closed ? 'text-ink-faint' : 'text-accent',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          closed ? 'border border-ink-faint' : 'bg-accent',
        )}
      />
      {children}
    </span>
  );
}
