import { createClient, Client } from "@libsql/client";
import { ServiceItem, SystemSettings, TimeSlot, Order } from "./types";

let dbInstance: Client | null = null;

export function getDb(): Client {
  if (!dbInstance) {
    const url = process.env.DATABASE_URL || "file:local.db";
    dbInstance = createClient({ url });
  }
  return dbInstance;
}

let isInitialized = false;

export async function ensureDbInitialized() {
  if (isInitialized) return;
  const db = getDb();

  // 1. Tabele
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price INTEGER NOT NULL,
      badge TEXT,
      is_active INTEGER NOT NULL DEFAULT 1
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS time_slots (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      max_capacity INTEGER NOT NULL DEFAULT 2,
      booked_count INTEGER NOT NULL DEFAULT 0,
      is_blocked INTEGER NOT NULL DEFAULT 0
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      city TEXT NOT NULL,
      cemetery_id TEXT NOT NULL,
      cemetery_name TEXT NOT NULL,
      grave_type TEXT NOT NULL,
      grave_location_mode TEXT NOT NULL,
      deceased_name TEXT,
      sector_info TEXT,
      grave_photo_data_url TEXT,
      grobonet_link TEXT,
      package_id TEXT NOT NULL,
      package_name TEXT NOT NULL,
      package_price INTEGER NOT NULL,
      addons_json TEXT NOT NULL DEFAULT '[]',
      total_price INTEGER NOT NULL,
      discount_applied INTEGER NOT NULL DEFAULT 0,
      slot_date TEXT NOT NULL,
      slot_time TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_blik',
      contractor_token TEXT NOT NULL,
      contractor_notes TEXT,
      photo_before_data_url TEXT,
      photo_after_data_url TEXT,
      completed_at TEXT
    );
  `);

  // 2. Sprawdzenie i seedowanie ustawień
  const settingsCount = await db.execute("SELECT COUNT(*) as cnt FROM settings;");
  if (Number(settingsCount.rows[0].cnt) === 0) {
    const defaultSettings: [string, string][] = [
      ["blik_phone", "501 234 567"],
      ["blik_recipient", "Czysta Pamięć Śląsk"],
      ["admin_pin", "1920"],
      ["promo_code", "SLASK10"],
      ["promo_discount_percent", "10"],
      ["multi_grave_discount_percent", "20"],
      ["banner_text", "Śpiesz się: Ostatnie wolne terminy przed 1 Listopada w Chorzowie, Katowicach i okolicach!"],
      ["stripe_enabled", "0"]
    ];

    for (const [key, value] of defaultSettings) {
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);",
        args: [key, value]
      });
    }
  }

  // 3. Sprawdzenie i seedowanie usług / cennika
  const servicesCount = await db.execute("SELECT COUNT(*) as cnt FROM services;");
  if (Number(servicesCount.rows[0].cnt) === 0) {
    const defaultServices = [
      // Pakiety
      {
        id: "pkg-basic",
        category: "package",
        name: "Pakiet Pamięć Podstawowa",
        description: "Ręczne mycie płyty, zamiatanie liści i igliwia, usunięcie wypalonych zniczy, postawienie 1 znicza pamięci.",
        price: 129,
        badge: "Podstawowy"
      },
      {
        id: "pkg-complex",
        category: "package",
        name: "Pakiet Śląska Troska (Kompleksowy)",
        description: "Mycie aktywną pianą, czyszczenie i odświeżenie liter, odchwaszczanie kostki/obrzeża, nabłyszczenie kamienia, 2 znicze 48h.",
        price: 189,
        badge: "NAJCZĘŚCIEJ WYBIERANY"
      },
      {
        id: "pkg-vip",
        category: "package",
        name: "Pakiet Złoty Znicz VIP (Wszystkich Świętych)",
        description: "Mycie ciśnieniowe + impregnacja hydrofobowa, mycie ławeczki, ułożenie żywej wiązanki jodłowej, 3 duże znicze i pełny raport foto.",
        price: 279,
        badge: "GWARANCJA DO 31.10"
      },

      // Rozmiary / Typy nagrobka
      {
        id: "gt-single",
        category: "grave_type",
        name: "Grób pojedynczy (standardowy)",
        description: "Wymiar ok. 100 x 200 cm.",
        price: 0,
        badge: "Standard"
      },
      {
        id: "gt-double",
        category: "grave_type",
        name: "Grób podwójny / rodzinny",
        description: "Wymiar ok. 160-200 x 200 cm (wymaga 2x więcej środków czyszczących).",
        price: 50,
        badge: "+50 zł"
      },
      {
        id: "gt-urn",
        category: "grave_type",
        name: "Grób urnowy / dziecięcy",
        description: "Kompaktowa płyta nagrobna.",
        price: -20,
        badge: "-20 zł"
      },
      {
        id: "gt-tomb",
        category: "grave_type",
        name: "Grobowiec murowany / sarkofag",
        description: "Duża bryła kamienna lub kwatera murowana.",
        price: 90,
        badge: "+90 zł"
      },
      {
        id: "gt-earth",
        category: "grave_type",
        name: "Mogiła ziemna z krzyżem",
        description: "Wypielenie chwastów, formowanie obrzeża mogiły i podsypanie korą/ziemią.",
        price: 30,
        badge: "+30 zł"
      },

      // Kwiaty
      {
        id: "fl-chrys-yellow",
        category: "flower",
        name: "Chryzantema doniczkowa żółta (duża kula)",
        description: "Świeża chryzantema z lokalnego śląskiego gospodarstwa, odporna na przymrozki.",
        price: 45,
        badge: "Świeże Kwiaty"
      },
      {
        id: "fl-chrys-white",
        category: "flower",
        name: "Chryzantema doniczkowa biała (duża kula)",
        description: "Klasyczna, szlachetna biel, gęste pąki kwiatowe.",
        price: 45,
        badge: "Świeże Kwiaty"
      },
      {
        id: "fl-heather-trio",
        category: "flower",
        name: "Misa wrzosów jesiennych (trio kolorów)",
        description: "Wrzosy w ozdobnej, obciążonej misie – przetrwają cały listopad.",
        price: 39,
        badge: "Trwałe"
      },
      {
        id: "fl-wreath-natural",
        category: "flower",
        name: "Wiązanka żywa z jodły nobilis ze stroikiem",
        description: "Gęste żywe gałęzie jodły szlachetnej, szyszki, susz, wstęga pamięci, stabilna i obciążona.",
        price: 89,
        badge: "Żywa Wiązanka"
      },

      // Znicze
      {
        id: "cd-rucho-special",
        category: "candle",
        name: "Znicz Serce Ruchu Chorzów 'PAMIĘTAMY'",
        description: "Lokalna edycja limitowana: szklane kobaltowe serce z herbem i dedykacją 'Niebieska Pamięć'. Wkład parafinowy 60h.",
        price: 59,
        badge: "LOKALNA EDYCJA SPECJALNA"
      },
      {
        id: "cd-classic",
        category: "candle",
        name: "Znicz klasyczny szklany (wkład 48h)",
        description: "Czyste szklane szkło, metalowa pokrywka odporna na wiatr.",
        price: 18,
        badge: "Klasyczny"
      },
      {
        id: "cd-solar",
        category: "candle",
        name: "Znicz solarny LED 'Wieczny Płomień' (365 dni)",
        description: "Panel solarny ładujący akumulatorek – świeci każdej nocy przez cały rok.",
        price: 49,
        badge: "Całoroczny"
      },
      {
        id: "cd-kapliczka-xxl",
        category: "candle",
        name: "Kapliczka szklana XXL ze złotym krzyżem",
        description: "Ciężki znicz kapliczkowy o wysokości 38 cm, wkład parafinowy 72h.",
        price: 65,
        badge: "Prestiżowy"
      },

      // Usługi dodatkowe
      {
        id: "add-impregnation",
        category: "addon",
        name: "Hydrofobowa impregnacja kamienia",
        description: "Zabezpiecza granit lub lastryko przed wnikaniem wody, mrozem i powstawaniem mchu.",
        price: 45,
        badge: "Polecane przed zimą"
      },
      {
        id: "add-letters",
        category: "addon",
        name: "Odświeżenie i czytelność liter",
        description: "Ręczne doczyszczenie i konserwacja napisów na tablicy nagrobnej.",
        price: 40,
        badge: "Renowacja"
      },
      {
        id: "add-bench",
        category: "addon",
        name: "Czyszczenie i mycie ławeczki",
        description: "Umycie i odkażenie ławeczki przy grobie.",
        price: 25,
        badge: null
      }
    ];

    for (const s of defaultServices) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO services (id, category, name, description, price, badge, is_active)
              VALUES (?, ?, ?, ?, ?, ?, 1);`,
        args: [s.id, s.category, s.name, s.description, s.price, s.badge || null]
      });
    }
  }

  // 4. Sprawdzenie i seedowanie siatki slotów (25.10 do 01.11, 08:00 - 18:00, max_capacity = 2)
  const slotsCount = await db.execute("SELECT COUNT(*) as cnt FROM time_slots;");
  if (Number(slotsCount.rows[0].cnt) === 0) {
    const dates = [
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01"
    ];
    const hours = [
      "08:00",
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
      "18:00"
    ];

    for (const d of dates) {
      for (const h of hours) {
        const slotId = `${d}_${h}`;
        await db.execute({
          sql: `INSERT OR IGNORE INTO time_slots (id, date, time, max_capacity, booked_count, is_blocked)
                VALUES (?, ?, ?, 2, 0, 0);`,
          args: [slotId, d, h]
        });
      }
    }
  }

  isInitialized = true;
}

// Funkcje pomocnicze pobierania danych

export async function getSettings(): Promise<SystemSettings> {
  await ensureDbInitialized();
  const db = getDb();
  const res = await db.execute("SELECT key, value FROM settings;");
  const map: Record<string, string> = {};
  for (const row of res.rows) {
    map[String(row.key)] = String(row.value);
  }

  return {
    blikPhone: map["blik_phone"] || "501 234 567",
    blikRecipient: map["blik_recipient"] || "Czysta Pamięć Śląsk",
    adminPin: map["admin_pin"] || "1920",
    promoCode: map["promo_code"] || "SLASK10",
    promoDiscountPercent: Number(map["promo_discount_percent"] || 10),
    multiGraveDiscountPercent: Number(map["multi_grave_discount_percent"] || 20),
    bannerText: map["banner_text"] || "Ostatnie wolne terminy przed 1 Listopada!",
    stripeEnabled: map["stripe_enabled"] === "1"
  };
}

export async function getServices(): Promise<ServiceItem[]> {
  await ensureDbInitialized();
  const db = getDb();
  const res = await db.execute("SELECT id, category, name, description, price, badge, is_active FROM services WHERE is_active = 1;");
  return res.rows.map((r) => ({
    id: String(r.id),
    category: r.category as any,
    name: String(r.name),
    description: String(r.description),
    price: Number(r.price),
    badge: r.badge ? String(r.badge) : undefined,
    isActive: Boolean(r.is_active)
  }));
}

export async function getAllServicesAdmin(): Promise<ServiceItem[]> {
  await ensureDbInitialized();
  const db = getDb();
  const res = await db.execute("SELECT id, category, name, description, price, badge, is_active FROM services ORDER BY category, price ASC;");
  return res.rows.map((r) => ({
    id: String(r.id),
    category: r.category as any,
    name: String(r.name),
    description: String(r.description),
    price: Number(r.price),
    badge: r.badge ? String(r.badge) : undefined,
    isActive: Boolean(r.is_active)
  }));
}

export async function getTimeSlots(date: string): Promise<TimeSlot[]> {
  await ensureDbInitialized();
  const db = getDb();
  const res = await db.execute({
    sql: "SELECT id, date, time, max_capacity, booked_count, is_blocked FROM time_slots WHERE date = ? ORDER BY time ASC;",
    args: [date]
  });

  return res.rows.map((r) => {
    const maxCapacity = Number(r.max_capacity);
    const bookedCount = Number(r.booked_count);
    const isBlocked = Boolean(r.is_blocked);
    let status: 'available' | 'last_spot' | 'sold_out' = 'available';

    if (isBlocked || bookedCount >= maxCapacity) {
      status = 'sold_out';
    } else if (bookedCount === maxCapacity - 1) {
      status = 'last_spot';
    }

    return {
      id: String(r.id),
      date: String(r.date),
      time: String(r.time),
      maxCapacity,
      bookedCount,
      isBlocked,
      status
    };
  });
}
