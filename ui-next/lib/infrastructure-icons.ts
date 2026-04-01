import {
  Boxes,
  Cloud,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Network,
  Server,
  Shield,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

export const INFRASTRUCTURE_ICON_VALUES = [
  "server",
  "cloud",
  "database",
  "network",
  "shield",
  "storage",
  "boxes",
  "cpu",
  "globe",
  "waypoints",
] as const;

export type InfrastructureIconKey = (typeof INFRASTRUCTURE_ICON_VALUES)[number];

export const DEFAULT_INFRASTRUCTURE_ICON: InfrastructureIconKey = "server";

export const infrastructureIconLabels: Record<InfrastructureIconKey, string> = {
  server: "Server",
  cloud: "Cloud",
  database: "Database",
  network: "Network",
  shield: "Security",
  storage: "Storage",
  boxes: "Services",
  cpu: "Compute",
  globe: "Global",
  waypoints: "Routing",
};

export const infrastructureIconComponents: Record<InfrastructureIconKey, LucideIcon> = {
  server: Server,
  cloud: Cloud,
  database: Database,
  network: Network,
  shield: Shield,
  storage: HardDrive,
  boxes: Boxes,
  cpu: Cpu,
  globe: Globe,
  waypoints: Waypoints,
};

export const infrastructureIconOptions = INFRASTRUCTURE_ICON_VALUES.map((value) => ({
  value,
  label: infrastructureIconLabels[value],
  icon: infrastructureIconComponents[value],
}));

export function isInfrastructureIconKey(value: string | null | undefined): value is InfrastructureIconKey {
  return INFRASTRUCTURE_ICON_VALUES.includes(value as InfrastructureIconKey);
}

export function normalizeInfrastructureIcon(value: string | null | undefined): InfrastructureIconKey {
  return isInfrastructureIconKey(value) ? value : DEFAULT_INFRASTRUCTURE_ICON;
}
