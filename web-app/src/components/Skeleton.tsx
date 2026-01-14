type SkeletonProps = {
  className?: string;
};

export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={[
        'animate-pulse rounded-md bg-gray-200 dark:bg-[#2a2a2a]',
        className ?? '',
      ].join(' ')}
    />
  );
}

