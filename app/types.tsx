import { ProgramId } from "@nillion/client-vms";
import { z } from "zod";

export const PermissionSchema = z.object({
  uid: z.string().min(1),
  read: z.boolean(),
  write: z.boolean(),
  delete: z.boolean(),
  compute: z.array(ProgramId),
});

export const SecretSchema = z.object({
  id: z.optional(z.string().uuid()),
  name: z.string().min(1).max(128),
  value: z.string().min(1),
  datatype: z.enum(["text", "json", "int"]),
  creationDate: z.coerce.date(),
  expirationDate: z.coerce.date(),
  permissions: z.array(PermissionSchema),
});

export type Secret = z.infer<typeof SecretSchema>;
export type Permission = z.infer<typeof PermissionSchema>;
