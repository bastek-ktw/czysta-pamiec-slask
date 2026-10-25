"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Order, TimeSlot, ServiceItem, SystemSettings } from "@/lib/types";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Zakładki
  const [activeTab, setActiveTab] = useState<"orders" | "slots" | "pricing">("orders");

  // Dane
  const [orders, setOrders] = useState<Order[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState("2026-10-31");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Statusy i filtry
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Logowanie
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinInput })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Nieprawidłowy PIN");
      }
      setIsAuthenticated(true);
      loadAllAdminData();
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  // Ładowanie danych
  const loadAllAdminData = async () => {
    setIsLoading(true);
    try {
      const [ordersRes, slotsRes, servicesRes] = await Promise.all([
        fetch("/api/admin/orders").then((r) => r.json()),
        fetch(`/api/admin/slots?date=${selectedDate}`).then((r) => r.json()),
        fetch("/api/admin/services").then((r) => r.json())
      ]);

      if (ordersRes.ok) setOrders(ordersRes.data);
      if (slotsRes.ok) setSlots(slotsRes.data);
      if (servicesRes.ok) {
        setServices(servicesRes.data.services);
        setSettings(servicesRes.data.settings);
      }
    } catch (err) {
      console.error("Admin load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetch(`/api/admin/slots?date=${selectedDate}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.ok) setSlots(res.data);
        });
    }
  }, [selectedDate, isAuthenticated]);

  // Akcje zamówień
  const handleStatusChange = async (orderId: string, newStatus: Order["status"]) => {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus })
      });
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
        showToast(`Zaktualizowano status zamówienia ${orderId}`);
      }
    } catch (e) {
      showToast("Błąd aktualizacji statusu");
    }
  };

  // Akcje slotów
  const handleSlotAction = async (slotId: string, action: "increase_capacity" | "decrease_capacity" | "toggle_block") => {
    try {
      const res = await fetch("/api/admin/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, action })
      });
      if (res.ok) {
        // Przeładuj sloty
        const slotsRes = await fetch(`/api/admin/slots?date=${selectedDate}`).then((r) => r.json());
        if (slotsRes.ok) setSlots(slotsRes.data);
        showToast("Zaktualizowano konfigurację slotu!");
      }
    } catch (e) {
      showToast("Błąd aktualizacji slotu");
    }
  };

  // Zmiana ceny usługi
  const handlePriceChange = async (serviceId: string, newPriceStr: string) => {
    const newPrice = parseInt(newPriceStr, 10);
    if (isNaN(newPrice)) return;
    try {
      const res = await fetch("/api/admin/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, price: newPrice })
      });
      if (res.ok) {
        setServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, price: newPrice } : s)));
        showToast("Cena została zaktualizowana!");
      }
    } catch (e) {
      showToast("Błąd aktualizacji ceny");
    }
  };

  // Zmiana telefonu BLIK
  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blikPhone: settings.blikPhone,
          blikRecipient: settings.blikRecipient,
          bannerText: settings.bannerText
        })
      });
      if (res.ok) {
        showToast("Ustawienia systemowe zapisane!");
      }
    } catch (e) {
      showToast("Błąd zapisu ustawień");
    }
  };

  // Widok logowania
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
        <div className="max-w-sm w-full bg-surface-container-lowest rounded-2xl p-6 shadow-xl border border-outline-variant/30 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[24px]">lock</span>
          </div>
          <h1 className="font-serif-title text-2xl font-bold text-primary">Panel Dyspozytora</h1>
          <p className="text-xs text-on-surface-variant">
            Wprowadź 4-cyfrowy kod PIN dyspozytora (Domyślnie: 1920)
          </p>

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="password"
              maxLength={6}
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••"
              className="w-full h-12 text-center tracking-[0.5em] font-mono text-xl rounded-xl bg-surface-container-low border border-outline-variant focus:ring-2 focus:ring-primary"
            />

            {authError && <p className="text-xs text-error font-semibold">{authError}</p>}

            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary-container text-white font-bold text-sm shadow-md transition-colors"
            >
              Odblokuj panel
            </button>
          </form>

          <Link href="/" className="inline-block text-xs text-on-surface-variant hover:text-primary underline mt-2">
            Wróć do sklepu
          </Link>
        </div>
      </div>
    );
  }

  // Filtrowane zlecenia
  const filteredOrders = filterStatus === "all"
    ? orders
    : orders.filter((o) => o.status === filterStatus);

  // Obliczenia metryk do Bento Grid
  const totalRevenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.totalPrice, 0);
  const pendingBlikCount = orders.filter((o) => o.status === "pending_blik").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;

  return (
    <div className="min-h-screen flex flex-col bg-surface pb-12">
      {/* Toast powiadomień */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-primary text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-[18px]">info</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Górny pasek admina */}
      <header className="bg-primary text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px] text-secondary-fixed">shield_person</span>
            </div>
            <div>
              <span className="font-serif-title text-lg font-bold">Dyspozytornia Czysta Pamięć</span>
              <span className="text-[11px] text-white/70 block -mt-0.5">Górny Śląsk • 1 Listopada</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg flex items-center gap-1 font-semibold transition-colors"
            >
              <span>Zobacz sklep</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </Link>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="text-xs bg-white/10 hover:bg-red-500/80 px-2.5 py-1.5 rounded-lg transition-colors"
              title="Wyloguj"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Zakładki */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/30 sticky top-16 z-20">
        <div className="max-w-6xl mx-auto px-4 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "orders"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">assignment</span>
            <span>Dyspozytornia Zleceń ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("slots")}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "slots"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            <span>Kalendarz i Sloty (+1 Miejsce)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pricing")}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "pricing"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">payments</span>
            <span>Cennik, Znicze i BLIK</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 w-full space-y-6">
        {/* Metryki Bento Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm">
            <span className="text-xs text-on-surface-variant font-medium block">Łączna wartość</span>
            <span className="font-serif-title text-2xl font-bold text-primary mt-1 block">
              {totalRevenue} zł
            </span>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm">
            <span className="text-xs text-on-surface-variant font-medium block">Oczekuje na BLIK</span>
            <span className="font-serif-title text-2xl font-bold text-secondary mt-1 block">
              {pendingBlikCount}
            </span>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm">
            <span className="text-xs text-on-surface-variant font-medium block">Wszystkie zlecenia</span>
            <span className="font-serif-title text-2xl font-bold text-primary mt-1 block">
              {orders.length}
            </span>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm">
            <span className="text-xs text-on-surface-variant font-medium block">Wykonane & Raport foto</span>
            <span className="font-serif-title text-2xl font-bold text-living-ivy mt-1 block">
              {completedCount}
            </span>
          </div>
        </div>

        {/* ================== ZAKŁADKA 1: DYSPOZYTORNIA ZLECEŃ ================== */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            {/* Filtry */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { id: "all", label: `Wszystkie (${orders.length})` },
                { id: "pending_blik", label: `Oczekuje na BLIK (${pendingBlikCount})` },
                { id: "paid", label: "Opłacone" },
                { id: "in_progress", label: "W realizacji" },
                { id: "completed", label: `Zakończone (${completedCount})` }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    filterStatus === f.id
                      ? "bg-primary text-white"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Lista kart zamówień */}
            <div className="space-y-3">
              {filteredOrders.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant text-xs bg-surface-container-lowest rounded-xl border">
                  Brak zleceń w wybranej kategorii.
                </div>
              ) : (
                filteredOrders.map((ord) => {
                  const contractorLink = typeof window !== "undefined"
                    ? `${window.location.origin}/zlecenie/${ord.contractorToken}`
                    : `/zlecenie/${ord.contractorToken}`;
                  const reportLink = typeof window !== "undefined"
                    ? `${window.location.origin}/raport/${ord.contractorToken}`
                    : `/raport/${ord.contractorToken}`;

                  const whatsappContractorUrl = `https://wa.me/?text=${encodeURIComponent(
                    `Zlecenie ${ord.id} - ${ord.cemeteryName} (${ord.slotDate} ${ord.slotTime})\nPakiet: ${ord.packageName}\nLink dla wykonawcy: ${contractorLink}`
                  )}`;

                  const whatsappClientUrl = `https://wa.me/${ord.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Dzień dobry! Zlecenie mycia nagrobka ${ord.id} na cmentarzu ${ord.cemeteryName} zostało zrealizowane. Tutaj znajduje się raport fotograficzny PRZED i PO: ${reportLink}`
                  )}`;

                  return (
                    <div
                      key={ord.id}
                      className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm bg-primary/10 text-primary px-2 py-0.5 rounded">
                              {ord.id}
                            </span>
                            <span className="text-xs text-on-surface-variant">
                              {new Date(ord.createdAt).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              ord.status === "completed"
                                ? "bg-living-ivy/20 text-living-ivy"
                                : ord.status === "paid"
                                ? "bg-blue-100 text-blue-700"
                                : ord.status === "pending_blik"
                                ? "bg-secondary-fixed text-on-secondary-fixed-variant"
                                : "bg-surface-container text-on-surface-variant"
                            }`}>
                              {ord.status === "pending_blik" && "Oczekuje na BLIK"}
                              {ord.status === "paid" && "Opłacone"}
                              {ord.status === "assigned" && "Przypisane"}
                              {ord.status === "in_progress" && "W trakcie"}
                              {ord.status === "completed" && "Wykonane (Foto)"}
                              {ord.status === "cancelled" && "Anulowane"}
                            </span>
                          </div>

                          <h3 className="font-bold text-primary text-sm mt-1">
                            📍 {ord.cemeteryName} ({ord.city})
                          </h3>
                        </div>

                        <div className="text-right">
                          <span className="font-serif-title text-xl font-bold text-primary">
                            {ord.totalPrice} zł
                          </span>
                          <span className="text-[11px] text-on-surface-variant block font-medium">
                            Termin: {ord.slotDate} ({ord.slotTime})
                          </span>
                        </div>
                      </div>

                      {/* Szczegóły zlecenia */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-surface-container-low p-3 rounded-lg text-xs">
                        <div>
                          <span className="text-on-surface-variant block font-medium">Klient:</span>
                          <span className="font-bold text-primary">{ord.customerName}</span>
                          <a href={`tel:${ord.customerPhone}`} className="text-secondary block font-mono hover:underline">
                            📞 {ord.customerPhone}
                          </a>
                        </div>

                        <div>
                          <span className="text-on-surface-variant block font-medium">Lokalizacja grobu:</span>
                          {ord.deceasedName && <span className="font-semibold text-primary block">Zmarły: {ord.deceasedName}</span>}
                          {ord.sectorInfo && <span className="text-primary block">Sektor: {ord.sectorInfo}</span>}
                          {ord.grobonetLink && (
                            <a
                              href={ord.grobonetLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-secondary font-semibold hover:underline inline-flex items-center gap-0.5 mt-0.5"
                            >
                              Otwórz Grobonet <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                            </a>
                          )}
                        </div>

                        <div>
                          <span className="text-on-surface-variant block font-medium">Zakres prac:</span>
                          <span className="font-bold text-primary block">{ord.packageName}</span>
                          <span className="text-on-surface-variant block text-[11px]">{ord.graveType}</span>
                          {ord.addons.length > 0 && (
                            <span className="text-secondary font-medium block text-[11px] mt-0.5">
                              + {ord.addons.map((a) => `${a.name} (x${a.quantity})`).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Miniatura zdjęcia grobu jeśli wgrane */}
                      {ord.gravePhotoDataUrl && (
                        <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-outline-variant/30">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ord.gravePhotoDataUrl}
                            alt="Zdjęcie od klienta"
                            className="w-12 h-12 rounded object-cover border"
                          />
                          <span className="text-xs text-on-surface-variant">
                            Klient załączył zdjęcie/mapę do namierzenia grobu
                          </span>
                        </div>
                      )}

                      {/* Akcje dyspozytorskie */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline-variant/20">
                        {/* Zmiana statusu */}
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-on-surface-variant">Zmień status:</span>
                          {ord.status === "pending_blik" && (
                            <button
                              onClick={() => handleStatusChange(ord.id, "paid")}
                              className="px-2.5 py-1 rounded bg-living-ivy text-white font-bold hover:bg-emerald-700"
                            >
                              ✓ Oznacz jako Opłacone
                            </button>
                          )}
                          {ord.status === "paid" && (
                            <button
                              onClick={() => handleStatusChange(ord.id, "in_progress")}
                              className="px-2.5 py-1 rounded bg-primary text-white font-bold"
                            >
                              Rozpocznij realizację
                            </button>
                          )}
                          {ord.status !== "completed" && (
                            <button
                              onClick={() => handleStatusChange(ord.id, "completed")}
                              className="px-2.5 py-1 rounded bg-surface-container text-primary font-bold hover:bg-surface-container-high"
                            >
                              Oznacz Ukończone
                            </button>
                          )}
                        </div>

                        {/* Przyciski wysyłki linków */}
                        <div className="flex items-center gap-2">
                          <a
                            href={whatsappContractorUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                          >
                            <span>Wyślij wykonawcy (WhatsApp)</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(contractorLink);
                              showToast("Skopiowano link zlecenia do schowka!");
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-outline-variant bg-white text-primary text-xs font-semibold hover:bg-surface-container"
                          >
                            Kopiuj link
                          </button>

                          {ord.status === "completed" && (
                            <a
                              href={whatsappClientUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-secondary text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                            >
                              <span>Wyślij raport foto klientowi</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================== ZAKŁADKA 2: KALENDARZ I SLOTY ================== */}
        {activeTab === "slots" && (
          <div className="space-y-4">
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-serif-title text-xl font-bold text-primary">
                    Zarządzanie obłożeniem godzinowym
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Dodaj +1 miejsce na wybraną godzinę, gdy do dyspozycji jest kolejna ekipa w terenie
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-on-surface-variant">Wybierz dzień:</span>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-10 px-3 rounded-lg bg-surface-container-low border text-xs font-bold text-primary"
                  >
                    {[
                      "2026-10-25",
                      "2026-10-26",
                      "2026-10-27",
                      "2026-10-28",
                      "2026-10-29",
                      "2026-10-30",
                      "2026-10-31",
                      "2026-11-01"
                    ].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Siatka slotów w adminie */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {slots.map((s) => (
                  <div
                    key={s.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 ${
                      s.isBlocked
                        ? "bg-red-50/50 border-red-200"
                        : s.bookedCount >= s.maxCapacity
                        ? "bg-amber-50/40 border-amber-200"
                        : "bg-surface-container-low border-outline-variant/30"
                    }`}
                  >
                    <div>
                      <span className="font-serif-title text-lg font-bold text-primary block">
                        {s.time}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-bold text-primary">
                          Zajęte: {s.bookedCount} / {s.maxCapacity}
                        </span>
                        {s.isBlocked && (
                          <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded font-bold">
                            ZABLOKOWANY
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSlotAction(s.id, "increase_capacity")}
                        className="px-2.5 py-1 rounded bg-primary text-white text-xs font-bold hover:bg-primary-container"
                        title="Zwiększ limit o 1 (nowy wykonawca)"
                      >
                        +1 slot
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSlotAction(s.id, "toggle_block")}
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          s.isBlocked
                            ? "bg-green-600 text-white"
                            : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                        }`}
                        title={s.isBlocked ? "Odblokuj godzinę" : "Zablokuj godzinę"}
                      >
                        {s.isBlocked ? "Odblokuj" : "Zablokuj"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================== ZAKŁADKA 3: CENNIK I USTAWIENIA ================== */}
        {activeTab === "pricing" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Edycja cen */}
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 space-y-3">
              <h3 className="font-serif-title text-xl font-bold text-primary">Edycja cennika na żywo</h3>
              <p className="text-xs text-on-surface-variant">
                Wprowadź nową kwotę w PLN. Zmiana działa natychmiast bez restartu aplikacji.
              </p>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {services.map((srv) => (
                  <div
                    key={srv.id}
                    className="p-2.5 rounded-lg bg-surface-container-low flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-primary block">{srv.name}</span>
                      <span className="text-[10px] text-on-surface-variant uppercase">{srv.category}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        defaultValue={srv.price}
                        onBlur={(e) => handlePriceChange(srv.id, e.target.value)}
                        className="w-20 h-8 px-2 rounded bg-white border border-outline-variant text-right font-bold text-xs"
                      />
                      <span className="font-bold text-primary">zł</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ustawienia Express BLIK i Baner */}
            {settings && (
              <form
                onSubmit={handleSettingsSave}
                className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 space-y-4"
              >
                <h3 className="font-serif-title text-xl font-bold text-primary">Ustawienia BLIK i Baneru</h3>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                    Numer telefonu do odbioru BLIK na telefon
                  </label>
                  <input
                    type="text"
                    value={settings.blikPhone}
                    onChange={(e) => setSettings({ ...settings, blikPhone: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low border text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                    Nazwa odbiorcy przelewu BLIK
                  </label>
                  <input
                    type="text"
                    value={settings.blikRecipient}
                    onChange={(e) => setSettings({ ...settings, blikRecipient: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low border text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                    Tekst globalnego banera promocyjnego
                  </label>
                  <textarea
                    rows={2}
                    value={settings.bannerText}
                    onChange={(e) => setSettings({ ...settings, bannerText: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-surface-container-low border text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary-container text-white font-bold text-xs shadow-md transition-colors"
                >
                  Zapisz ustawienia
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
