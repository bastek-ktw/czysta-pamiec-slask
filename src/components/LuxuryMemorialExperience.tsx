"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import cemeteriesData from "@/data/cemeteries.json";
import { ServiceItem, SystemSettings, TimeSlot, Order } from "@/lib/types";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { OrderSuccessModal } from "./OrderSuccessModal";
import { compressImageToWebP } from "@/lib/imageCompressor";

interface LuxuryProps {
  initialServices: ServiceItem[];
  settings: SystemSettings;
}

const CITIES = [
  "Chorzów",
  "Katowice",
  "Siemianowice Śląskie",
  "Bytom",
  "Świętochłowice",
  "Ruda Śląska"
];

const AVAILABLE_DATES = [
  { date: "2026-10-25", label: "25 Paź", dayName: "Niedziela" },
  { date: "2026-10-26", label: "26 Paź", dayName: "Poniedziałek" },
  { date: "2026-10-27", label: "27 Paź", dayName: "Wtorek" },
  { date: "2026-10-28", label: "28 Paź", dayName: "Środa" },
  { date: "2026-10-29", label: "29 Paź", dayName: "Czwartek" },
  { date: "2026-10-30", label: "30 Paź", dayName: "Piątek" },
  { date: "2026-10-31", label: "31 Paź", dayName: "Sobota (Wigilia)" },
  { date: "2026-11-01", label: "01 Lis", dayName: "Wszystkich Świętych" }
];

export function LuxuryMemorialExperience({ initialServices, settings }: LuxuryProps) {
  // Wybory lokalizacji
  const [selectedCity, setSelectedCity] = useState("Chorzów");
  const [selectedCemeteryId, setSelectedCemeteryId] = useState("chorzow-cmentarna");
  const [deceasedName, setDeceasedName] = useState("");
  const [gravePhotoDataUrl, setGravePhotoDataUrl] = useState<string>("");
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);

  // Wybory oferty
  const [selectedPackageId, setSelectedPackageId] = useState("pkg-complex");
  const [selectedGraveType, setSelectedGraveType] = useState("gt-single");
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({
    "cd-rucho-special": 1,
    "fl-chrys-yellow": 1
  });
  const [isSecondGrave, setIsSecondGrave] = useState(false);

  // Termin
  const [selectedDate, setSelectedDate] = useState("2026-10-31");
  const [selectedTime, setSelectedTime] = useState("11:00");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Klient
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"blik_manual" | "stripe">("blik_manual");

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Pobieranie slotów
  useEffect(() => {
    setIsLoadingSlots(true);
    fetch(`/api/slots?date=${selectedDate}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && res.data) {
          setSlots(res.data);
          const found = res.data.find((s: TimeSlot) => s.time === selectedTime && s.status !== "sold_out");
          if (!found) {
            const firstOpen = res.data.find((s: TimeSlot) => s.status !== "sold_out");
            if (firstOpen) setSelectedTime(firstOpen.time);
          }
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setIsLoadingSlots(false));
  }, [selectedDate]);

  const cityCemeteries = cemeteriesData.filter(
    (c) => c.city.toLowerCase() === selectedCity.toLowerCase()
  );
  const currentCemetery = cemeteriesData.find((c) => c.id === selectedCemeteryId) || cityCemeteries[0];

  const packages = initialServices.filter((s) => s.category === "package");
  const graveTypes = initialServices.filter((s) => s.category === "grave_type");
  const currentPkg = packages.find((p) => p.id === selectedPackageId) || packages[0];
  const currentGrave = graveTypes.find((g) => g.id === selectedGraveType) || graveTypes[0];

  let addonsSum = 0;
  const addonsList: { id: string; name: string; price: number; quantity: number }[] = [];
  for (const [id, qty] of Object.entries(selectedAddons)) {
    if (qty > 0) {
      const item = initialServices.find((s) => s.id === id);
      if (item) {
        addonsSum += item.price * qty;
        addonsList.push({ id: item.id, name: item.name, price: item.price, quantity: qty });
      }
    }
  }

  const basePrice = (currentPkg?.price || 0) + (currentGrave?.price || 0) + addonsSum;
  const discountAmount = isSecondGrave ? Math.round(basePrice * 0.2) : 0;
  const finalPrice = Math.max(0, basePrice - discountAmount);

  const updateAddonQty = (id: string, delta: number) => {
    setSelectedAddons((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsPhotoUploading(true);
      const webp = await compressImageToWebP(file, 1000, 95000);
      setGravePhotoDataUrl(webp);
    } catch (err: any) {
      alert("Błąd zdjęcia: " + err.message);
    } finally {
      setIsPhotoUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!deceasedName.trim() && !gravePhotoDataUrl) {
      setSubmitError("Podaj imię i nazwisko bliskiej osoby lub załącz zdjęcie grobu.");
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 9) {
      setSubmitError("Podaj numer telefonu do przesłania raportu fotograficznego po umyciu.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        customerName: deceasedName.trim() ? `Opieka: ${deceasedName.trim()}` : "Klient Pamięci",
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || "",
        city: selectedCity,
        cemeteryId: currentCemetery.id,
        cemeteryName: currentCemetery.name,
        graveType: currentGrave.name,
        graveLocationMode: gravePhotoDataUrl ? "photo" : "deceased",
        deceasedName: deceasedName.trim() || undefined,
        gravePhotoDataUrl: gravePhotoDataUrl || undefined,
        grobonetLink: currentCemetery.grobonetUrl,
        packageId: currentPkg.id,
        packageName: currentPkg.name,
        packagePrice: currentPkg.price,
        addons: addonsList,
        totalPrice: finalPrice,
        discountApplied: discountAmount,
        slotDate: selectedDate,
        slotTime: selectedTime,
        paymentMethod
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Wystąpił błąd rezerwacji terminu.");
      }

      setCreatedOrder(json.data);
    } catch (err: any) {
      setSubmitError(err.message || "Błąd zapisu zamówienia.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {createdOrder && (
        <OrderSuccessModal
          order={createdOrder}
          blikPhone={settings.blikPhone}
          blikRecipient={settings.blikRecipient}
          onClose={() => setCreatedOrder(null)}
        />
      )}

      <div className="min-h-screen bg-[#070D0A] text-[#F1F5F9] selection:bg-[#F59E0B] selection:text-black">
        {/* Ciepłe, nastrojowe oświetlenie zniczy (Atmospheric Glow) */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[600px] bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.15)_0%,_rgba(15,41,30,0.18)_40%,_transparent_75%)] pointer-events-none z-0"></div>

        {/* 1. Header Apple Glassmorphism z zachowaniem odstępów */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#070D0A]/90 backdrop-blur-2xl border-b border-white/[0.08] px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#163827] to-[#0A1B13] border border-[#23583E] flex items-center justify-center text-[#F59E0B] shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <span className="material-symbols-outlined text-[22px]">local_florist</span>
              </div>
              <div>
                <span className="font-serif-title text-xl font-bold tracking-tight text-white block leading-none">
                  Czysta Pamięć
                </span>
                <span className="text-[10px] text-white/50 tracking-wider uppercase font-semibold">
                  Górny Śląsk • 1 Listopada
                </span>
              </div>
            </div>

            {/* Apple Dynamic Island Capsule */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/70 border border-white/[0.15] shadow-lg">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F59E0B] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#F59E0B]"></span>
              </span>
              <span className="text-xs text-white/90 font-medium">
                Płomień Pamięci zapłonie przed 1 Listopada
              </span>
            </div>

            {/* Infolinia i Panel */}
            <div className="flex items-center gap-2">
              <a
                href="tel:+48327201101"
                className="h-10 px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-semibold text-white/90 flex items-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-[17px] text-[#F59E0B]">call</span>
                <span className="hidden md:inline">32 720 11 01</span>
              </a>

              <Link
                href="/admin"
                className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-white/70 hover:text-white transition-all"
                title="Panel Dyspozytora"
              >
                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
              </Link>
            </div>
          </div>
        </header>

        {/* 2. Hero Section z odpowiednim odsunięciem pod fixed headerem */}
        <section className="relative z-10 max-w-6xl mx-auto px-4 pt-28 pb-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-xs font-bold text-[#F59E0B]">
            <span>🕯️ Spokój i godna pamięć o Twoich bliskich</span>
          </div>

          <h1 className="font-serif-title text-3xl sm:text-5xl font-bold tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Zadbany nagrobek, świeże kwiaty i światło, które nie gaśnie.
          </h1>

          <p className="text-sm sm:text-base text-white/70 max-w-2xl mx-auto leading-relaxed">
            Nie musisz martwić się dojazdem w jesiennym chłodzie i deszczu. Nasza zaufana śląska ekipa umyje nagrobek, odnowi litery, położy okazałe chryzantemy i zapali znicz pamięci.
          </p>
        </section>

        {/* 3. Główny Układ Dwukolumnowy (Desktop) i Płynny Jednokolumnowy (Mobile) */}
        <main className="relative z-10 max-w-6xl mx-auto px-4 pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEWA KOLUMNA: WIZUALNA JAKOŚĆ, PRZED/PO, PAKIETY (7 kolumn) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Interaktywny Efekt Pracy (Przed / Po) */}
              <div className="bg-[#0D1812]/90 rounded-3xl p-6 border border-white/[0.1] shadow-2xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold tracking-wider text-[#F59E0B] uppercase">
                      Efekt profesjonalnego mycia
                    </span>
                    <h2 className="font-serif-title text-2xl font-bold text-white">
                      Kamień lśniący jak nowy
                    </h2>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                    Ekologiczna piana
                  </span>
                </div>

                <p className="text-xs text-white/70 leading-relaxed">
                  Używamy bezpiecznych preparatów biodegradowalnych, które usuwają mech i zabrudzenia, nie naruszając granitu ani złoceń liter.
                </p>

                <div className="pt-2">
                  <BeforeAfterSlider />
                </div>
              </div>

              {/* Trzy Pakiety Pielęgnacji */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-serif-title text-xl font-bold text-white">
                    Wybierz pakiet pielęgnacji
                  </h3>
                  <span className="text-xs text-white/60">Raport foto przed i po w każdym pakiecie</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {packages.map((pkg) => {
                    const isSelected = selectedPackageId === pkg.id;
                    const isRecommended = pkg.id === "pkg-complex";
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative select-none ${
                          isSelected
                            ? "bg-gradient-to-b from-[#153A2A] to-[#0C1B14] border-[#F59E0B] shadow-[0_0_30px_rgba(245,158,11,0.25)] scale-[1.02]"
                            : "bg-[#0D1812]/70 border-white/[0.08] hover:border-white/[0.2]"
                        }`}
                      >
                        {isRecommended && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F59E0B] text-black text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md">
                            Najczęściej Wybierany
                          </span>
                        )}

                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-sm text-white">
                              {pkg.name.replace("Pakiet ", "")}
                            </span>
                            {isSelected && (
                              <span className="material-symbols-outlined text-[#F59E0B] text-[20px]">
                                check_circle
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-white/70 mt-2 leading-relaxed">
                            {pkg.description}
                          </p>
                        </div>

                        <div className="mt-4 pt-2.5 border-t border-white/[0.1] flex items-baseline justify-between">
                          <span className="text-[10px] text-white/50 uppercase font-semibold">Cena:</span>
                          <span className="font-serif-title text-2xl font-bold text-white">
                            {pkg.price} zł
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Śląska Tożsamość: Znicz Ruchu "PAMIĘTAMY" & Chryzantemy */}
              <div className="bg-[#0D1812]/90 rounded-3xl p-6 border border-white/[0.1] space-y-4">
                <div>
                  <span className="text-[11px] font-bold tracking-wider text-[#F59E0B] uppercase">
                    Śląska Tożsamość & Tradycja
                  </span>
                  <h3 className="font-serif-title text-2xl font-bold text-white">
                    Specjalne Znicze i Świeże Chryzantemy
                  </h3>
                  <p className="text-xs text-white/70">
                    Nasz pracownik postawi je na grobie i zapali w wybranym przez Ciebie dniu.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Znicz Ruchu Chorzów PAMIĘTAMY */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0B2545]/70 to-[#071629]/95 border border-blue-500/40 flex items-center justify-between gap-3 shadow-[0_4px_25px_rgba(11,37,69,0.4)]">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-lg shadow-[0_0_15px_rgba(37,99,235,0.6)]">
                        R
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">Znicz &quot;PAMIĘTAMY&quot;</span>
                          <span className="text-[8px] bg-blue-500 text-white font-bold px-1.5 py-0.2 rounded uppercase">
                            Ruch Chorzów
                          </span>
                        </div>
                        <span className="text-[11px] text-blue-200/90 block mt-0.5">
                          Niebieskie szkło, wkład 60h • 59 zł
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-black/50 rounded-xl p-1 border border-white/10 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateAddonQty("cd-rucho-special", -1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 font-bold"
                      >
                        -
                      </button>
                      <span className="w-4 text-center text-xs font-bold text-white">
                        {selectedAddons["cd-rucho-special"] || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateAddonQty("cd-rucho-special", 1)}
                        className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold hover:bg-blue-500 shadow-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Chryzantema Żółta Duża Kula */}
                  <div className="p-4 rounded-2xl bg-[#0F2218]/90 border border-emerald-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-[#F59E0B] border border-amber-500/30 flex items-center justify-center text-xl">
                        🌼
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          Chryzantema duża kula
                        </span>
                        <span className="text-[11px] text-white/70 block mt-0.5">
                          Lokalna, mrozoodporna • 45 zł
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-black/50 rounded-xl p-1 border border-white/10 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateAddonQty("fl-chrys-yellow", -1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 font-bold"
                      >
                        -
                      </button>
                      <span className="w-4 text-center text-xs font-bold text-white">
                        {selectedAddons["fl-chrys-yellow"] || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateAddonQty("fl-chrys-yellow", 1)}
                        className="w-7 h-7 rounded-lg bg-[#F59E0B] text-black flex items-center justify-center font-bold hover:bg-amber-400 shadow-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PRAWA KOLUMNA: 1-SCREEN INSTANT CHECKOUT (5 kolumn) */}
            <div className="lg:col-span-5">
              <form
                onSubmit={handleSubmit}
                className="bg-[#0D1812] rounded-3xl p-6 sm:p-7 border border-white/[0.15] shadow-2xl space-y-5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#F59E0B] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse"></span>
                      Szybka Rezerwacja (Bez Rejestracji)
                    </span>
                    <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Dojazd 0 zł
                    </span>
                  </div>
                  <h3 className="font-serif-title text-2xl font-bold text-white mt-1.5">
                    Zleć opiekę nad mogiłą
                  </h3>
                </div>

                {/* Krok 1: Cmentarz na Śląsku */}
                <div className="space-y-2.5">
                  <label htmlFor="city-select" className="block text-xs font-semibold text-white/80 uppercase">
                    1. Wybierz miasto i cmentarz
                  </label>

                  {/* Chipy Miast */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                    {CITIES.map((city) => {
                      const isSel = selectedCity.toLowerCase() === city.toLowerCase();
                      return (
                        <button
                          key={city}
                          type="button"
                          onClick={() => {
                            setSelectedCity(city);
                            const first = cemeteriesData.find((c) => c.city.toLowerCase() === city.toLowerCase());
                            if (first) setSelectedCemeteryId(first.id);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                            isSel
                              ? "bg-[#F59E0B] text-black shadow-md font-bold"
                              : "bg-white/[0.06] text-white/70 hover:bg-white/[0.12]"
                          }`}
                        >
                          {city}
                        </button>
                      );
                    })}
                  </div>

                  {/* Dropdown cmentarzy */}
                  <div className="relative">
                    <select
                      id="cemetery-select"
                      name="cemetery"
                      value={selectedCemeteryId}
                      onChange={(e) => setSelectedCemeteryId(e.target.value)}
                      className="w-full h-11 pl-3.5 pr-8 rounded-xl bg-white/[0.06] border border-white/[0.18] text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B] appearance-none cursor-pointer"
                    >
                      {cityCemeteries.map((c) => (
                        <option key={c.id} value={c.id} className="bg-[#0D1812] text-white">
                          {c.name} — {c.address}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-white/50 pointer-events-none text-[20px]">
                      unfold_more
                    </span>
                  </div>
                </div>

                {/* Krok 2: Osoba upamiętniona */}
                <div className="space-y-2">
                  <label htmlFor="deceased-name-input" className="block text-xs font-semibold text-white/80 uppercase">
                    2. Kogo wspominasz?
                  </label>

                  <div className="relative">
                    <span className="material-symbols-outlined text-white/40 absolute left-3 top-2.5 text-[20px]">
                      person
                    </span>
                    <input
                      id="deceased-name-input"
                      name="deceased-name"
                      type="text"
                      autoComplete="name"
                      value={deceasedName}
                      onChange={(e) => setDeceasedName(e.target.value)}
                      placeholder="Imię i nazwisko bliskiego (np. Jan Kowalski)"
                      className="w-full h-11 pl-10 pr-3 rounded-xl bg-white/[0.06] border border-white/[0.18] text-xs font-medium text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                    />
                  </div>

                  {/* Dodanie zdjęcia grobu */}
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    {gravePhotoDataUrl ? (
                      <span className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">check_circle</span>
                        Zdjęcie grobu dołączone
                      </span>
                    ) : (
                      <label className="text-[#F59E0B] hover:underline font-semibold text-[11px] flex items-center gap-1 cursor-pointer">
                        <span className="material-symbols-outlined text-[15px]">add_a_photo</span>
                        <span>{isPhotoUploading ? "Zapis zdjęcia..." : "Masz zdjęcie grobu? Dodaj tutaj"}</span>
                        <input
                          id="grave-photo-upload"
                          name="grave-photo"
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          disabled={isPhotoUploading}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Krok 3: Wybór dnia i godziny */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-white/80 uppercase">
                      3. Kiedy mamy umyć mogiłę?
                    </label>
                    <span className="text-[10px] text-[#F59E0B] font-bold">Max 2 mogiły / h</span>
                  </div>

                  {/* Dni */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                    {AVAILABLE_DATES.map((d) => {
                      const isSel = selectedDate === d.date;
                      return (
                        <button
                          key={d.date}
                          type="button"
                          onClick={() => setSelectedDate(d.date)}
                          className={`px-3 py-1.5 rounded-xl text-center min-w-[70px] shrink-0 border transition-all ${
                            isSel
                              ? "bg-white text-black font-bold border-white shadow-sm"
                              : "bg-white/[0.05] border-white/[0.08] text-white/70 hover:bg-white/[0.1]"
                          }`}
                        >
                          <span className="text-[9px] uppercase block opacity-75">{d.dayName}</span>
                          <span className="text-xs font-bold block">{d.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Godziny */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {slots.slice(0, 8).map((slot) => {
                      const isSel = selectedTime === slot.time;
                      const isSoldOut = slot.status === "sold_out";
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={isSoldOut}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all ${
                            isSoldOut
                              ? "bg-white/[0.03] text-white/20 cursor-not-allowed line-through"
                              : isSel
                              ? "bg-[#F59E0B] text-black shadow-md scale-105 font-black"
                              : "bg-white/[0.06] text-white/80 hover:bg-white/[0.12]"
                          }`}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Krok 4: Telefon do wysłania zdjęć (Zero haseł) */}
                <div className="space-y-2">
                  <label htmlFor="customer-phone-input" className="block text-xs font-semibold text-white/80 uppercase">
                    4. Gdzie przesłać raport foto po umyciu?
                  </label>

                  <input
                    id="customer-phone-input"
                    name="tel"
                    type="tel"
                    autoComplete="tel"
                    inputMode="numeric"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Twój numer telefonu (np. 500 600 700) *"
                    className="w-full h-11 px-3.5 rounded-xl bg-white/[0.06] border border-white/[0.18] text-xs font-medium text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                  />
                </div>

                {/* Błąd */}
                {submitError && (
                  <div className="p-3 bg-red-950/70 border border-red-500/50 text-red-300 rounded-xl text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Podsumowanie i Przycisk Płatności Apple / BLIK */}
                <div className="pt-3 border-t border-white/[0.1] space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[11px] text-white/50 block">Łącznie do zapłaty:</span>
                      <span className="text-xs text-emerald-400 font-semibold">
                        Gwarancja wykonania & Raport foto
                      </span>
                    </div>

                    <div className="text-right">
                      {discountAmount > 0 && (
                        <span className="text-xs text-white/40 line-through font-medium mr-1.5">
                          {basePrice} zł
                        </span>
                      )}
                      <span className="font-serif-title text-3xl font-bold text-[#F59E0B]">
                        {finalPrice} zł
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#F59E0B] via-[#EAB308] to-[#D97706] hover:brightness-110 text-black font-extrabold text-base shadow-[0_0_30px_rgba(245,158,11,0.4)] active:scale-98 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[24px]">flash_on</span>
                    <span>{isSubmitting ? "Rezerwacja..." : `Zarezerwuj i Zapłać BLIK (${finalPrice} zł)`}</span>
                  </button>

                  <p className="text-[10px] text-center text-white/50 leading-relaxed">
                    Termin rezerwowany jest natychmiast na 15 minut. Po kliknięciu otrzymasz numer do szybkiego przelewu BLIK na telefon lub kod QR.
                  </p>
                </div>
              </form>
            </div>

          </div>
        </main>
      </div>
    </>
  );
}
