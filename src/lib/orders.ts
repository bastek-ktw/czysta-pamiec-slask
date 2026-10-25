import { z } from "zod";
import { getDb, ensureDbInitialized } from "./db";
import { Order, OrderAddon } from "./types";
import crypto from "crypto";

export const CreateOrderSchema = z.object({
  customerName: z.string().min(2, "Imię i nazwisko jest wymagane"),
  customerPhone: z.string().min(9, "Numer telefonu musi mieć min. 9 cyfr"),
  customerEmail: z.string().email("Niepoprawny format email").optional().or(z.literal("")),
  city: z.string().min(2),
  cemeteryId: z.string().min(2),
  cemeteryName: z.string().min(2),
  graveType: z.string().min(2),
  graveLocationMode: z.enum(["deceased", "photo", "sector"]),
  deceasedName: z.string().optional(),
  sectorInfo: z.string().optional(),
  gravePhotoDataUrl: z.string().optional(),
  grobonetLink: z.string().optional(),
  packageId: z.string().min(2),
  packageName: z.string().min(2),
  packagePrice: z.number().nonnegative(),
  addons: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(),
      quantity: z.number().int().positive()
    })
  ).default([]),
  totalPrice: z.number().nonnegative(),
  discountApplied: z.number().nonnegative().default(0),
  slotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format daty: RRRR-MM-DD"),
  slotTime: z.string().regex(/^\d{2}:\d{2}$/, "Format godziny: GG:MM"),
  paymentMethod: z.enum(["blik_manual", "stripe"]).default("blik_manual")
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export async function createOrderAtomic(input: CreateOrderInput): Promise<Order> {
  await ensureDbInitialized();
  const db = getDb();

  const slotId = `${input.slotDate}_${input.slotTime}`;

  // 1. Sprawdzenie slotu i inkrementacja w transakcji
  // Używamy transakcji LibSQL z twardym warunkiem booked_count < max_capacity
  const tx = await db.transaction("write");

  try {
    const slotCheck = await tx.execute({
      sql: "SELECT id, max_capacity, booked_count, is_blocked FROM time_slots WHERE id = ?;",
      args: [slotId]
    });

    if (slotCheck.rows.length === 0) {
      // Jeśli slot z jakiegoś powodu nie istniał, wstawiamy go z domyślnym limitem 2
      await tx.execute({
        sql: "INSERT INTO time_slots (id, date, time, max_capacity, booked_count, is_blocked) VALUES (?, ?, ?, 2, 0, 0);",
        args: [slotId, input.slotDate, input.slotTime]
      });
    } else {
      const row = slotCheck.rows[0];
      const maxCap = Number(row.max_capacity);
      const booked = Number(row.booked_count);
      const blocked = Boolean(row.is_blocked);

      if (blocked || booked >= maxCap) {
        throw new Error("Wybrany slot godzinowy jest już w pełni zarezerwowany (max 2/h). Prosimy wybrać inną godzinę.");
      }
    }

    // Inkrementacja licznika slotu z zabezpieczeniem race-condition
    const updateRes = await tx.execute({
      sql: "UPDATE time_slots SET booked_count = booked_count + 1 WHERE id = ? AND booked_count < max_capacity AND is_blocked = 0;",
      args: [slotId]
    });

    if (updateRes.rowsAffected === 0) {
      throw new Error("Slot został zajęty w tym samym ułamku sekundy przez innego klienta. Wybierz inną godzinę.");
    }

    // Generowanie czytelnego ID zamówienia np. CP-101
    const orderCountRes = await tx.execute("SELECT COUNT(*) as count FROM orders;");
    const nextNum = 101 + Number(orderCountRes.rows[0].count);
    const orderId = `CP-${nextNum}`;

    // Unikalny token dla wykonawcy
    const contractorToken = `ct_${crypto.randomBytes(12).toString("hex")}`;
    const createdAt = new Date().toISOString();

    const orderRecord: Order = {
      id: orderId,
      createdAt,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail || "",
      city: input.city,
      cemeteryId: input.cemeteryId,
      cemeteryName: input.cemeteryName,
      graveType: input.graveType,
      graveLocationMode: input.graveLocationMode,
      deceasedName: input.deceasedName,
      sectorInfo: input.sectorInfo,
      gravePhotoDataUrl: input.gravePhotoDataUrl,
      grobonetLink: input.grobonetLink,
      packageId: input.packageId,
      packageName: input.packageName,
      packagePrice: input.packagePrice,
      addons: input.addons,
      totalPrice: input.totalPrice,
      discountApplied: input.discountApplied,
      slotDate: input.slotDate,
      slotTime: input.slotTime,
      paymentMethod: input.paymentMethod,
      status: "pending_blik",
      contractorToken
    };

    await tx.execute({
      sql: `
        INSERT INTO orders (
          id, created_at, customer_name, customer_phone, customer_email,
          city, cemetery_id, cemetery_name, grave_type, grave_location_mode,
          deceased_name, sector_info, grave_photo_data_url, grobonet_link,
          package_id, package_name, package_price, addons_json, total_price,
          discount_applied, slot_date, slot_time, payment_method, status,
          contractor_token
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?
        );
      `,
      args: [
        orderRecord.id,
        orderRecord.createdAt,
        orderRecord.customerName,
        orderRecord.customerPhone,
        orderRecord.customerEmail,
        orderRecord.city,
        orderRecord.cemeteryId,
        orderRecord.cemeteryName,
        orderRecord.graveType,
        orderRecord.graveLocationMode,
        orderRecord.deceasedName || null,
        orderRecord.sectorInfo || null,
        orderRecord.gravePhotoDataUrl || null,
        orderRecord.grobonetLink || null,
        orderRecord.packageId,
        orderRecord.packageName,
        orderRecord.packagePrice,
        JSON.stringify(orderRecord.addons),
        orderRecord.totalPrice,
        orderRecord.discountApplied,
        orderRecord.slotDate,
        orderRecord.slotTime,
        orderRecord.paymentMethod,
        orderRecord.status,
        orderRecord.contractorToken
      ]
    });

    await tx.commit();
    return orderRecord;
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}
