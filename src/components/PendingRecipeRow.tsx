import { Calendar, Clock, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { TableCell, TableRow } from "~/components/ui/table";

interface PendingRecipeRowProps {
  analysisId: string;
  filename: string;
  imageUrl: string | null;
  uploadDate: number;
  status: "pending" | "processing" | "completed" | "failed";
  title?: string;
}

export function PendingRecipeRow({
  filename,
  imageUrl,
  uploadDate,
  status,
  title,
}: PendingRecipeRowProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusText = () => {
    switch (status) {
      case "pending":
        return "Queued for analysis...";
      case "processing":
        return "Analyzing recipe...";
      case "completed":
        return "Creating recipe...";
      case "failed":
        return "Analysis failed";
      default:
        return "Processing...";
    }
  };

  const displayTitle = title || filename.replace(/\.[^/.]+$/, "");

  return (
    <TableRow className="opacity-60 animate-pulse">
      <TableCell>
        <div className="relative">
          <Avatar className="h-10 w-10 rounded-md">
            <AvatarImage src={imageUrl || ""} alt={filename} className="object-cover" />
            <AvatarFallback className="rounded-md bg-muted">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
            <Loader2 className="h-3 w-3 animate-spin text-primary-foreground" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium text-muted-foreground">
            {displayTitle}
          </p>
          <p className="text-xs text-muted-foreground italic">
            {getStatusText()}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="bg-muted text-muted-foreground border-dashed">
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            analyzing
          </span>
        </Badge>
      </TableCell>
      <TableCell>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="w-12">--</span>
        </span>
      </TableCell>
      <TableCell>
        <span className="flex items-center gap-1 text-muted-foreground text-sm">
          <Calendar className="h-3 w-3" />
          {formatDate(uploadDate)}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <div className="h-8 w-8" />
      </TableCell>
      <TableCell>
        <div className="h-8 w-8" />
      </TableCell>
    </TableRow>
  );
}
