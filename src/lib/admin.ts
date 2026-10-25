import { getDb, ensureDbInitialized } from "./db";
import { Order, TimeSlot, ServiceItem, SystemSettings } from "./types";

export async function getAllOrders(): Promise<Order[]> {
  await ensureDbInitialized();
  const db = getDb();
  const res = await db.execute("SELECT * FROM orders ORDER BY created_at DESC;");

  return res.rows.map((r) => ({
    id: String(r.id),
    createdAt: String(r.created_at),
    customerName: String(r.customer_name),
    customerPhone: String(r.customer_phone),
    customerEmail: String(r.customer_email || ""),
    city: String(r.city),
    cemeteryId: String(r.cemetery_id),
    cemeteryName: String(r.cemetery_name),
    graveType: String(r.grave_type),
    graveLocationMode: r.grave_location_mode as any,
    deceasedName: r.deceased_name ? String(r.deceased_name) : undefined,
    sectorInfo: r.sector_info ? String(r.sector_info) : undefined,
    gravePhotoDataUrl: r.grave_photo_data_url ? String(r.grave_photo_data_url) : undefined,
    grobonetLink: r.grobonet_link ? String(r.grobonet_link) : undefined,
    packageId: String(r.package_id),
    packageName: String(r.package_name),
    packagePrice: Number(r.package_price),
    addons: JSON.parse(String(r.addons_json || "[]")),
    totalPrice: Number(r.total_price),
    discountApplied: Number(r.discount_applied || 0),
    slotDate: String(r.slot_date),
    slotTime: String(r.slot_time),
    paymentMethod: r.payment_method as any,
    status: r.status as any,
    contractorToken: String(r.contractor_token),
    contractorNotes: r.contractor_notes ? String(r.contractor_notes) : undefined,
    photoBeforeDataUrl: r.photo_before_data_url ? String(r.photo_before_data_url) : undefined,
    photoAfterDataUrl: r.photo_after_data_url ? String(r.photo_after_data_url) : undefined,
    completedAt: r.completed_at ? String(r.completed_at) : undefined
  }));
}

export async function updateOrderStatus(orderId: string, status: Order["status"]): Promise<void> {
  await ensureDbInitialized();
  const db = getDb();
  await db.execute({
    sql: "UPDATE orders SET status = ? WHERE id = ?;",
    args: [status, orderId]
  });
}

export async function updateSlotCapacity(slotId: string, delta: number): Promise<void> {
  await ensureDbInitialized();
  const db = getDb();
  await db.execute({
    sql: "UPDATE time_slots SET max_capacity = MAX(1, max_capacity + ?) WHERE id = ?;",
    args: [delta, slotId]
  });
}

export async function toggleSlotBlock(slotId: string): Promise<void> {
  await ensureDbInitialized();
  const db = getDb();
  await db.execute({
    sql: "UPDATE time_slots SET is_blocked = CASE WHEN is_blocked = 1 THEN 0 ELSE 1 END WHERE id = ?;",
    args: [slotId]
  });
}

export async function updateServicePrice(serviceId: string, newPrice: number): Promise<void> {
  await ensureDbInitialized();
  const db = getDb();
  await db.execute({
    sql: "UPDATE services SET price = ? WHERE id = ?;",
    args: [newPrice, serviceId]
  });
}

export async function updateSystemSettings(partial: Partial<SystemSettings>): Promise<void> {
  await ensureDbInitialized();
  const db = getDb();

  const keyMap: Record<keyof SystemSettings, string> = {
    blikPhone: "blik_phone",
    blikRecipient: "blik_recipient",
    adminPin: "admin_pin",
    promoCode: "promo_code",
    promoDiscountPercent: "promo_discount_percent",
    multiGraveDiscountPercent: "multi_grave_discount_percent",
    bannerText: "banner_text",
    stripeEnabled: "stripe_enabled"
  };

  for (const [prop, val] of Object.entries(partial)) {
    const dbKey = keyMap[prop as keyof SystemSettings];
    if (dbKey && val !== undefined) {
      const strVal = typeof val === "boolean" ? (val ? "1" : "0") : String(val);
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);",
        args: [dbKey, strVal]
      });
    }
  }
}

export async function getOrderByContractorToken(token: string): Promise<Order | null> {
  await ensureDbInitialized();
  const db = getDb();
  const res = await db.execute({
    sql: "SELECT * FROM orders WHERE contractor_token = ?;",
    args: [token]
  });

  if (res.rows.length === 0) return null;
  const r = res.rows[0];

  return {
    id: String(r.id),
    createdAt: String(r.created_at),
    customerName: String(r.customer_name),
    customerPhone: String(r.customer_phone),
    customerEmail: String(r.customer_email || ""),
    city: String(r.city),
    cemeteryId: String(r.cemetery_id),
    cemeteryName: String(r.cemetery_name),
    graveType: String(r.grave_type),
    graveLocationMode: r.grave_location_mode as any,
    deceasedName: r.deceased_name ? String(r.deceased_name) : undefined,
    sectorInfo: r.sector_info ? String(r.sector_info) : undefined,
    gravePhotoDataUrl: r.grave_photo_data_url ? String(r.grave_photo_data_url) : undefined,
    grobonetLink: r.grobonet_link ? String(r.grobonet_link) : undefined,
    packageId: String(r.package_id),
    packageName: String(r.package_name),
    packagePrice: Number(r.package_price),
    addons: JSON.parse(String(r.addons_json || "[]")),
    totalPrice: Number(r.total_price),
    discountApplied: Number(r.discount_applied || 0),
    slotDate: String(r.slot_date),
    slotTime: String(r.slot_time),
    paymentMethod: r.payment_method as any,
    status: r.status as any,
    contractorToken: String(r.contractor_token),
    contractorNotes: r.contractor_notes ? String(r.contractor_notes) : undefined,
    photoBeforeDataUrl: r.photo_before_data_url ? String(r.photo_before_data_url) : undefined,
    photoAfterDataUrl: r.photo_after_data_url ? String(r.photo_after_data_url) : undefined,
    completedAt: r.completed_at ? String(r.completed_at) : undefined
  };
}

export async function updateContractorWork(
  token: string,
  data: {
    photoBeforeDataUrl?: string;
    photoAfterDataUrl?: string;
    contractorNotes?: string;
    isCompleted?: boolean;
  }
): Promise<void> {
  await ensureDbInitialized();
  const db = getDb();

  const updates: string[] = [];
  const args: any[] = [];

  if (data.photoBeforeDataUrl !== undefined) {
    updates.push("photo_before_data_url = ?");
    args.push(data.photoBeforeDataUrl);
  }
  if (data.photoAfterDataUrl !== undefined) {
    updates.push("photo_after_data_url = ?");
    args.push(data.photoAfterDataUrl);
  }
  if (data.contractorNotes !== undefined) {
    updates.push("contractor_notes = ?");
    args.push(data.contractorNotes);
  }
  if (data.isCompleted) {
    updates.push("status = 'completed'");
    updates.push("completed_at = ?");
    args.push(new Date().toISOString());
  }

  if (updates.length === 0) return;

  args.push(token);
  await db.execute({
    sql: `UPDATE orders SET ${updates.join(", ")} WHERE contractor_token = ?;`,
    args
  });
}
