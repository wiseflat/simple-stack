import { z } from "zod";
import { INFRASTRUCTURE_ICON_VALUES } from "@/lib/infrastructure-icons";

const infrastructureIconSchema = z.enum(INFRASTRUCTURE_ICON_VALUES, {
  error: "icon: invalid infrastructure icon",
});

export const InfrastructureCreateSchema = z.object({
  name: z.string().regex(/^[a-zA-Z\-]{3,100}$/, "name: 3-100 alpha chars"),
  description: z
    .string()
    .regex(/^[A-Za-z\s]{5,120}$/, "description: 5-120 chars"),
  icon: infrastructureIconSchema,
  color: z.string().min(1, "color required"),
});

export const InfrastructureUpdateSchema = z.object({
  name: z.string().regex(/^[a-zA-Z\-]{3,100}$/, "name: 3-100 alpha chars"),
  description: z
    .string()
    .regex(/^[A-Za-z\s]{5,120}$/, "description: 5-120 chars"),
  icon: infrastructureIconSchema,
  color: z.string().min(1, "color required"),
});

export const InfrastructureExecuteSchema = z.object({
  action: z.enum([
    "main",
    "timesyncd",
    "systemd-resolved",
    "docker",
    "nomad",
    "coredns",
    "firewall",
    "metrology",
    "nomad-clean-errors",
    "nvidia",
    "scan_exporter",
  ]),
});
