import { ActivityItem } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type ActivityFeedProps = {
  activity?: ActivityItem[];
  isLoading?: boolean;
};

export function ActivityFeed({ activity, isLoading }: ActivityFeedProps) {
  return (
    <Card className="border-muted">
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>
          Recent expenses, receipts, and settlement updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <div key={`activity-skeleton-${index}`} className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}

        {!isLoading &&
          activity?.map((item, index) => (
            <div key={item.id} className="space-y-1">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
              <p className="text-xs text-muted-foreground">{item.timestamp}</p>
              {index !== activity.length - 1 && <Separator className="mt-3" />}
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
