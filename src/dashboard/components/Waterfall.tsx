import type { ContentItem } from '@/shared/types';
import Card from '@/shared/components/Card';
import { cn } from '@/shared/utils/cn';

interface WaterfallProps {
  items: ContentItem[];
  isSelectMode?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  isDisintegrating?: boolean;
}

export default function Waterfall({ 
  items, 
  isSelectMode, 
  selectedIds, 
  onToggleSelect,
  isDisintegrating 
}: WaterfallProps) {
  return (
    <div className="columns-1 md:columns-2 gap-4 space-y-4">
      {items.map(item => (
        <div 
          key={item.id} 
          className={cn(
            "break-inside-avoid mb-4 transition-all duration-500",
            isDisintegrating && selectedIds?.includes(item.id) ? "disintegrate-item" : ""
          )}
          style={isDisintegrating && selectedIds?.includes(item.id) ? {
            '--dx': `${(Math.random() - 0.5) * 400}px`,
            '--dy': `${(Math.random() - 0.5) * 400}px`,
            '--dr': `${(Math.random() - 0.5) * 360}deg`
          } as React.CSSProperties : {}}
        >
          <Card 
            item={item} 
            isSelectMode={isSelectMode}
            isSelected={selectedIds?.includes(item.id)}
            onSelect={() => onToggleSelect?.(item.id)}
          />
        </div>
      ))}
    </div>
  );
}
