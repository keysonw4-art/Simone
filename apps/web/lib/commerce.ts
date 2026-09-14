import { z } from 'zod';

export const PurchaseSnapshotSchema = z.object({
  version: z.literal(1), kind: z.enum(['product', 'course']), id: z.string().uuid(),
  name: z.string().min(1), priceId: z.string().startsWith('price_'),
  priceCents: z.number().int().nonnegative(), currency: z.literal('brl'),
  accessMonths: z.number().int().min(1).max(120), grantsAll: z.boolean(),
  courseIds: z.array(z.string().uuid()),
  certificateType: z.enum(['DECLARATION', 'PROFESSIONAL']).nullable(),
}).refine(value => value.grantsAll || value.courseIds.length > 0, "Curso sem conteúdo");
export type PurchaseSnapshot = z.infer<typeof PurchaseSnapshotSchema>;

export function addAccessMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}
