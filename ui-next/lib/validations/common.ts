import { z } from "zod";

export const UidParamSchema = z.object({ id: z.string().min(1) });
export const IidParamSchema = z.object({ iid: z.string().min(1) });
