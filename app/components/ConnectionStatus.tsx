import { cn } from "@/lib/utils";

type ConnectionStatus = "disconnected" | "connected" | "connecting" | "error";

interface ConnectionStatusProps {
  status: ConnectionStatus;
}

const statusColors: Record<ConnectionStatus, string> = {
  disconnected: "bg-gray-500",
  connected: "bg-green-500",
  connecting: "bg-yellow-500",
  error: "bg-red-500",
};

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  return <div className={cn("w-3 h-3 rounded-full", statusColors[status])} />;
}
