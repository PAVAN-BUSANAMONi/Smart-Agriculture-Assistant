interface SkeletonProps {
  variant?: 'text' | 'card' | 'circle' | 'rect';
  width?: string;
  height?: string;
  className?: string;
  count?: number;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  count = 1,
}: SkeletonProps) {
  const base = 'skeleton-shimmer rounded';

  const variants: Record<string, string> = {
    text: `${base} h-4 rounded-md`,
    card: `${base} rounded-2xl`,
    circle: `${base} rounded-full`,
    rect: `${base} rounded-xl`,
  };

  const items = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`${variants[variant]} ${className}`}
      style={{
        width: width || (variant === 'text' ? `${70 + Math.random() * 30}%` : '100%'),
        height: height || (variant === 'card' ? '180px' : variant === 'circle' ? '48px' : variant === 'rect' ? '120px' : '16px'),
      }}
    />
  ));

  return <>{items}</>;
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`glass-card p-6 space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" width="40px" height="40px" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" height="12px" />
        </div>
      </div>
      <Skeleton variant="rect" height="100px" />
      <div className="space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" width="80%" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" width="44px" height="44px" />
        <Skeleton variant="text" width="200px" height="32px" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
