import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectSummary } from "@/lib/api-client";

type ProjectsCardProps = {
  projects?: ProjectSummary[];
  isLoading?: boolean;
};

const statusStyles: Record<ProjectSummary["status"], string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10",
  settling: "bg-amber-100 text-amber-700 dark:bg-amber-500/10",
  settled: "bg-slate-200 text-slate-700 dark:bg-slate-500/20",
};

export function ProjectsCard({ projects, isLoading }: ProjectsCardProps) {
  return (
    <Card className="border-muted">
      <CardHeader>
        <CardTitle>Groups & trips</CardTitle>
        <CardDescription>Follow every shared tab and who is involved</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <div key={`project-skeleton-${index}`} className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}

        {!isLoading &&
          projects?.map((project) => (
            <div key={project.id} className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{project.name}</p>
                <p className="text-sm text-muted-foreground">
                  Owned by {project.owner} · Updated {project.updatedAt}
                </p>
              </div>
              <Badge className={cn("capitalize", statusStyles[project.status])}>
                {project.status}
              </Badge>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
