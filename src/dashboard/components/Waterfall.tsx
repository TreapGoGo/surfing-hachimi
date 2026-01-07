import type { ContentItem } from '@/shared/types';
import Card from '@/shared/components/Card';

interface WaterfallProps {
  items: ContentItem[];
}

export default function Waterfall({ items }: WaterfallProps) {
  return (
    <div className="columns-1 md:columns-2 gap-4 space-y-4">
      {items.map(item => (
        <div key={item.id} className="break-inside-avoid mb-4">
          <Card item={item} />
        </div>
      ))}
    </div>
  );
}
