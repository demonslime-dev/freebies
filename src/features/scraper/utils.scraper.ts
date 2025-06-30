import db from "$db/index.ts";
import { product as p } from "$db/schema.ts";
import { CreateProductInput } from "$db/types.ts";

export async function saveProductToDatabase(product: CreateProductInput) {
  await db
    .insert(p)
    .values(product)
    .onConflictDoNothing({ target: [p.url, p.saleEndDate] });
}

export function convertTo24HourFormat(hours: string, minutes: string, period: string | "AM" | "PM") {
  let hoursIn24 = parseInt(hours, 10);

  if (period.toUpperCase() === "PM" && hoursIn24 < 12) hoursIn24 += 12;
  if (period.toUpperCase() === "AM" && hoursIn24 === 12) hoursIn24 = 0;

  return `${hoursIn24.toString().padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}
