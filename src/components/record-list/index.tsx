import { AdSlot } from '@/components/ad-slot';
import { RecordCard } from '@/components/record-card';
import type { RecordListItem } from '@/types/record';

interface RecordListProps {
  records: RecordListItem[];
  hideTopic?: boolean;
  showDeadline?: boolean;
  variant?: 'full' | 'compact';
  /**
   * The in-feed ad goes after the 5th result, one per page (spec 14.4). If the list
   * is shorter than five, no ad is emitted at all — putting an ad among three
   * results strains both the user and AdSense policy.
   */
  adSlotId?: string;
  emptyMessage?: string;
}

export function RecordList({
  records,
  hideTopic,
  showDeadline,
  variant,
  adSlotId,
  emptyMessage,
}: RecordListProps) {
  if (!records.length) {
    return emptyMessage ? (
      <p className="py-8 text-md text-ink-muted">{emptyMessage}</p>
    ) : null;
  }

  const showAd = Boolean(adSlotId) && records.length > 5;
  const head = showAd ? records.slice(0, 5) : records;
  const tail = showAd ? records.slice(5) : [];

  return (
    <div className="flex flex-col">
      {head.map((record) => (
        <RecordCard
          key={record.id}
          record={record}
          hideTopic={hideTopic}
          showDeadline={showDeadline}
          variant={variant}
        />
      ))}

      {showAd ? <AdSlot kind="in-feed" slotId={adSlotId} /> : null}

      {tail.map((record) => (
        <RecordCard
          key={record.id}
          record={record}
          hideTopic={hideTopic}
          showDeadline={showDeadline}
          variant={variant}
        />
      ))}
    </div>
  );
}
