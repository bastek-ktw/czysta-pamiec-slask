"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import cemeteriesData from "@/data/cemeteries.json";
import { ServiceItem, SystemSettings, TimeSlot, Order } from "@/lib/types";
import { compressImageToWebP } from "@/lib/imageCompressor";
import { OrderSuccessModal } from "./OrderSuccessModal";
import { BeforeAfterSlider } from "./BeforeAfterSlider";

interface ExpressBookingFlowProps {
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
  { date: "2026-10-25", label: "25 Paź", day: "Nd" },
  { date: "2026-10-26", label: "26 Paź", day: "Pn" },
  { date: "2026-10-27", label: "27 Paź", day: "Wt" },
  { date: "2026-10-28", label: "28 Paź", day: "Śr" },
  { date: "2026-10-29", label: "29 Paź", day: "Cz" },
  { date: "2026-10-30", label: "30 Paź", day: "Pt" },
  { date: "2026-10-31", label: "31 Paź", day: "Sb" },
  { date: "2026-11-01", label: "01 Lis", day: "Wszystkich Świętych" }
];

export function ExpressBookingFlow({ initialServices, settings }: ExpressBookingFlowProps) {
  // Stan formularza
  const [selectedCity, setSelectedCity] = useState("Chorzów");
  const [selectedCemeteryId, setSelectedCemeteryId] = useState("chorzow-cmentarna");
  const [deceasedName, setDeceasedName] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string>("");
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState("pkg-complex");
  const [selectedGraveType, setSelectedGraveType] = useState("gt-single");
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({
    "cd-rucho-special": 1 // domyślnie dodany znicz Ruchu "PAMIĘTAMY"
  });
  const [isSecondGrave, setIsSecondGrave] = useState(false);

  // Termin
  const [selectedDate, setSelectedDate] = useState("2026-10-31");
  const [selectedTime, setSelectedTime] = useState<string>("11:00");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Klient
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"blik_manual" | "stripe">("blik_manual");

  // Sukces i błędy
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [showSliderModal, setShowSliderModal] = useState(false);

  // Filtrowane cmentarze
  const cityCemeteries = cemeteriesData.filter(
    (c) => c.city.toLowerCase() === selectedCity.toLowerCase()
  );
  const currentCemetery = cemeteriesData.find((c) => c.id === selectedCemeteryId) || cityCemeteries[0];

  // Kategorie usług
  const packages = initialServices.filter((s) => s.category === "package");
  const graveTypes = initialServices.filter((s) => s.category === "grave_type");
  const flowers = initialServices.filter((s) => s.category === "flower");
  const candles = initialServices.filter((s) => s.category === "candle");

  // Pobieranie slotów
  useEffect(() => {
    setIsLoadingSlots(true);
    fetch(`/api/slots?date=${selectedDate}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && res.data) {
          setSlots(res.data);
          const available = res.data.find((s: TimeSlot) => s.time === selectedTime && s.status !== "sold_out");
          if (!available) {
            const firstOpen = res.data.find((s: TimeSlot) => s.status !== "sold_out");
            if (firstOpen) setSelectedTime(firstOpen.time);
          }
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setIsLoadingSlots(false));
  }, [selectedDate]);

  // Kalkulacja ceny
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

  // Obsługa zdjęcia
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsPhotoUploading(true);
      const webp = await compressImageToWebP(file, 1000, 95000);
      setPhotoDataUrl(webp);
    } catch (err: any) {
      alert("Błąd zdjęcia: " + err.message);
    } finally {
      setIsPhotoUploading(false);
    }
  };

  // Obsługa ilości dodatków
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

  // Zatwierdzenie zamówienia
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!deceasedName.trim() && !photoDataUrl) {
      setSubmitError("Podaj imię i nazwisko bliskiego lub załącz zdjęcie grobu, abyśmy mogli go odnaleźć.");
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 9) {
      setSubmitError("Podaj numer telefonu do wysłania raportu fotograficznego po umyciu.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        customerName: customerName.trim() || "Pielęgnacja Pamięci",
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || "",
        city: selectedCity,
        cemeteryId: currentCemetery.id,
        cemeteryName: currentCemetery.name,
        graveType: currentGrave.name,
        graveLocationMode: photoDataUrl ? "photo" : "deceased",
        deceasedName: deceasedName.trim() || undefined,
        gravePhotoDataUrl: photoDataUrl || undefined,
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
        throw new Error(json.error || "Błąd rezerwacji terminu.");
      }

      setCreatedOrder(json.data);
    } catch (err: any) {
      setSubmitError(err.message || "Wystąpił problem. Spróbuj ponownie.");
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

      {/* Modal z podglądem efektu przed/po */}
      {showSliderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-serif-title text-xl font-bold text-primary">Standard Czystej Pamięci</h3>
              <button
                onClick={() => setShowSliderModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-on-surface-variant">
              Zobacz efekt naszej pracy – ekologiczne mycie aktywną pianą, impregnacja oraz świeże kwiaty i znicze.
            </p>
            <BeforeAfterSlider />
            <button
              onClick={() => setShowSliderModal(false)}
              className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-xs"
            >
              Wróć do wyboru
            </button>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-[#F7F9F8] text-[#0D1C2F] flex flex-col antialiased selection:bg-[#D97706] selection:text-white pb-28">
        {/* iOS Dynamic Island Header (Ciepły puls pamięci) */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-[#E2E8F0]/60 shadow-[0_2px_12px_rgba(15,41,30,0.03)] px-4 py-2.5">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F291E] to-[#1A382B] flex items-center justify-center text-white shadow-sm">
                <span className="material-symbols-outlined text-[20px]">local_florist</span>
              </div>
              <div>
                <span className="font-serif-title text-lg font-bold text-[#0F291E] tracking-tight block leading-none">
                  Czysta Pamięć
                </span>
                <span className="text-[10px] text-[#475569] font-medium">Górny Śląsk</span>
              </div>
            </div>

            {/* Pulsująca pastylka Dynamic Island */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0F291E]/5 border border-[#0F291E]/10 text-xs font-semibold text-[#0F291E]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D97706] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D97706]"></span>
              </span>
              <span className="text-[11px] truncate font-medium">Zadbamy o grób Twoich bliskich</span>
            </div>

            {/* Infolinia */}
            <a
              href="tel:+48327201101"
              className="w-9 h-9 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F291E] transition-colors"
              title="Zadzwoń do nas"
            >
              <span className="material-symbols-outlined text-[18px]">call</span>
            </a>
          </div>
        </header>

        {/* Główny kontener Mobile-First (Wszystko w zasięgu kciuka) */}
        <main className="max-w-xl mx-auto w-full px-4 pt-3 space-y-3.5 flex-1">
          {/* Ciepłe powitanie i poczucie spokoju */}
          <div className="text-center py-2 space-y-1">
            <h1 className="font-serif-title text-2xl font-bold text-[#0F291E] tracking-tight">
              Pamięć, szacunek i czysty nagrobek
            </h1>
            <p className="text-xs text-[#475569] max-w-md mx-auto leading-relaxed">
              Nie musisz martwić się dojazdem w tłoku czy pogodą. Nasza śląska ekipa umyje nagrobek, położy żywe chryzantemy i zapali znicz pamięci.
            </p>
          </div>

          <form onSubmit={handleOrderSubmit} className="space-y-3.5">
            {/* 1. Karta Cmentarza (Kompaktowy wybór 1-Tap) */}
            <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold tracking-wider text-[#D97706] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">church</span>
                  1. Wybierz cmentarz
                </span>
                <span className="text-[11px] font-semibold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full">
                  Dojazd 0 zł
                </span>
              </div>

              {/* Chipy Miast (Horyzontalna rolka) */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                {CITIES.map((city) => {
                  const isSelected = selectedCity.toLowerCase() === city.toLowerCase();
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
                        isSelected
                          ? "bg-[#0F291E] text-white shadow-sm"
                          : "bg-[#F8FAFC] text-[#475569] hover:bg-[#F1F5F9]"
                      }`}
                    >
                      {city}
                    </button>
                  );
                })}
              </div>

              {/* Dropdown cmentarza */}
              <div className="relative">
                <select
                  value={selectedCemeteryId}
                  onChange={(e) => setSelectedCemeteryId(e.target.value)}
                  className="w-full h-11 pl-3.5 pr-8 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F291E] appearance-none"
                >
                  {cityCemeteries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.address})
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-2.5 text-[#64748B] pointer-events-none text-[20px]">
                  unfold_more
                </span>
              </div>
            </div>

            {/* 2. Kogo wspominamy (Szybkie pole) */}
            <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold tracking-wider text-[#D97706] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">favorite</span>
                  2. Kogo wspominasz?
                </span>
                <span className="text-[11px] text-[#475569]">Wyszukamy w bazie Grobonet</span>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <span className="material-symbols-outlined text-[#94A3B8] absolute left-3 top-2.5 text-[20px]">
                    person
                  </span>
                  <input
                    type="text"
                    value={deceasedName}
                    onChange={(e) => setDeceasedName(e.target.value)}
                    placeholder="Imię i nazwisko bliskiego (np. Jan Kowalski)"
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F291E]"
                  />
                </div>

                {/* Szybki upload zdjęcia grobu jeśli ma */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  {photoDataUrl ? (
                    <div className="flex items-center gap-2 text-[#059669] font-semibold text-[11px]">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>Zdjęcie grobu dołączone</span>
                      <button
                        type="button"
                        onClick={() => setPhotoDataUrl("")}
                        className="text-[#BA1A1A] underline ml-1"
                      >
                        usuń
                      </button>
                    </div>
                  ) : (
                    <label className="text-[#D97706] hover:underline font-semibold text-[11px] flex items-center gap-1 cursor-pointer">
                      <span className="material-symbols-outlined text-[15px]">add_photo_alternate</span>
                      <span>{isPhotoUploading ? "Optymalizacja..." : "Masz zdjęcie grobu? Dodaj tutaj"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={isPhotoUploading}
                        className="hidden"
                      />
                    </label>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowSliderModal(true)}
                    className="text-[#0F291E] font-semibold text-[11px] flex items-center gap-0.5 hover:underline"
                  >
                    <span>Zobacz efekty mycia</span>
                    <span className="material-symbols-outlined text-[13px]">visibility</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Pakiety i Dekoracje (Kompaktowe Kafelki Dotykowe) */}
            <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold tracking-wider text-[#D97706] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                  3. Wybierz pakiet troski
                </span>
                <span className="text-[10px] text-[#059669] font-bold">Raport foto w cenie</span>
              </div>

              {/* 3 Kafelki pakietów obok siebie */}
              <div className="grid grid-cols-3 gap-2">
                {packages.map((pkg) => {
                  const isSelected = selectedPackageId === pkg.id;
                  const isRecommended = pkg.id === "pkg-complex";
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackageId(pkg.id)}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left relative ${
                        isSelected
                          ? "border-[#0F291E] bg-[#0F291E]/5 shadow-md scale-[1.02]"
                          : "border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#CBD5E1]"
                      }`}
                    >
                      {isRecommended && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#D97706] text-white text-[8px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-tight shadow-sm whitespace-nowrap">
                          Polecany
                        </span>
                      )}
                      <div>
                        <span className="text-xs font-bold text-[#0F291E] block leading-tight">
                          {pkg.name.replace("Pakiet ", "").replace(" (Kompleksowy)", "")}
                        </span>
                        <span className="text-[10px] text-[#475569] mt-1 block line-clamp-2">
                          {pkg.id === "pkg-basic" && "Mycie + 1 mały znicz"}
                          {pkg.id === "pkg-complex" && "Aktywna piana + litery + 2 znicze"}
                          {pkg.id === "pkg-vip" && "Mycie ciśnieniowe + wiązanka + 3 znicze"}
                        </span>
                      </div>
                      <div className="mt-2 pt-1 border-t border-[#E2E8F0]/40">
                        <span className="font-serif-title text-base font-bold text-[#0F291E]">
                          {pkg.price} zł
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Typ nagrobka (Kompaktowy pasek) */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E2E8F0]/40">
                <span className="text-[#475569] font-medium">Wielkość nagrobka:</span>
                <select
                  value={selectedGraveType}
                  onChange={(e) => setSelectedGraveType(e.target.value)}
                  className="bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs font-bold text-[#0F291E]"
                >
                  {graveTypes.map((gt) => (
                    <option key={gt.id} value={gt.id}>
                      {gt.name} {gt.price !== 0 && `(${gt.price > 0 ? "+" : ""}${gt.price} zł)`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dodatki: Znicz Ruchu "PAMIĘTAMY" & Chryzantemy */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-[#0F291E] block">
                  Lokalna Edycja & Świeże Kwiaty:
                </span>

                {/* Znicz Ruchu Chorzów PAMIĘTAMY */}
                <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                      R
                    </span>
                    <div>
                      <span className="text-xs font-bold text-blue-950 block">
                        Znicz Ruchu Chorzów &quot;PAMIĘTAMY&quot;
                      </span>
                      <span className="text-[10px] text-blue-700">Kobaltowe szkło z herbem • 59 zł</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-white rounded-lg p-0.5 border border-blue-200">
                    <button
                      type="button"
                      onClick={() => updateAddonQty("cd-rucho-special", -1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-blue-900 font-bold hover:bg-blue-50"
                    >
                      -
                    </button>
                    <span className="w-4 text-center text-xs font-bold">
                      {selectedAddons["cd-rucho-special"] || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateAddonQty("cd-rucho-special", 1)}
                      className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center font-bold hover:bg-blue-700"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Chryzantema duża kula */}
                <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#D97706] text-[20px] shrink-0">
                      local_florist
                    </span>
                    <div>
                      <span className="text-xs font-bold text-[#0F172A] block">
                        Chryzantema doniczkowa (duża kula)
                      </span>
                      <span className="text-[10px] text-[#475569]">Lokalna, mrozoodporna • 45 zł</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-white rounded-lg p-0.5 border border-[#CBD5E1]">
                    <button
                      type="button"
                      onClick={() => updateAddonQty("fl-chrys-yellow", -1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-[#0F172A] font-bold hover:bg-[#F1F5F9]"
                    >
                      -
                    </button>
                    <span className="w-4 text-center text-xs font-bold">
                      {selectedAddons["fl-chrys-yellow"] || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateAddonQty("fl-chrys-yellow", 1)}
                      className="w-6 h-6 rounded bg-[#0F291E] text-white flex items-center justify-center font-bold hover:bg-[#1A382B]"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Termin i Godzina (Horyzontalna rolka jak w iOS) */}
            <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold tracking-wider text-[#D97706] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">calendar_today</span>
                  4. Kiedy mamy umyć nagrobek?
                </span>
                <span className="text-[11px] font-semibold text-[#0F291E]">
                  Gwarancja do 31.10
                </span>
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
                      className={`px-3 py-2 rounded-xl text-center min-w-[70px] shrink-0 border transition-all ${
                        isSel
                          ? "bg-[#0F291E] border-[#0F291E] text-white shadow-sm"
                          : "bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9]"
                      }`}
                    >
                      <span className="text-[9px] uppercase font-bold block opacity-75">{d.day}</span>
                      <span className="text-xs font-bold block mt-0.5">{d.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sloty godzinowe */}
              <div className="pt-1">
                <span className="text-[10px] text-[#475569] font-medium block mb-1.5">Wybierz godzinę wizyty ekipy:</span>
                <div className="grid grid-cols-4 gap-1.5">
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
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                            : isSel
                            ? "bg-[#D97706] text-white shadow-sm scale-105"
                            : "bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E2E8F0]"
                        }`}
                      >
                        {slot.time}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 5. Dane Klienta (Zero haseł, wystarczy telefon do raportu foto) */}
            <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold tracking-wider text-[#D97706] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">sms</span>
                  5. Gdzie wysłać raport foto?
                </span>
                <span className="text-[10px] text-[#059669] font-bold">Bez rejestracji</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Twój numer telefonu (np. 500 600 700) *"
                    className="w-full h-11 px-3.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F291E]"
                  />
                </div>

                <div>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="E-mail do faktury / raportu (opcjonalnie)"
                    className="w-full h-11 px-3.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F291E]"
                  />
                </div>
              </div>

              {/* Rabat na 2. grób */}
              <label className="flex items-center gap-2 pt-1 text-xs text-[#0F291E] font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSecondGrave}
                  onChange={(e) => setIsSecondGrave(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0F291E] focus:ring-[#0F291E]"
                />
                <span>Zlecam też drugi grób na tym cmentarzu (-20% rabatu)</span>
              </label>
            </div>

            {/* Błędy */}
            {submitError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-200">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{submitError}</span>
              </div>
            )}

            {/* 6. Sticky Apple / BLIK Dock (Zawsze pod kciukiem na dole) */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[#E2E8F0] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-4 py-3">
              <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
                {/* Cena */}
                <div>
                  <span className="text-[10px] text-[#475569] block font-medium">Razem do zapłaty:</span>
                  <div className="flex items-baseline gap-1">
                    {discountAmount > 0 && (
                      <span className="text-xs text-[#94A3B8] line-through font-medium">{basePrice} zł</span>
                    )}
                    <span className="font-serif-title text-2xl font-bold text-[#0F291E]">
                      {finalPrice} zł
                    </span>
                  </div>
                </div>

                {/* Główny przycisk konwersji (iOS Ambient Shimmer) */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 px-6 rounded-2xl bg-gradient-to-r from-[#D97706] to-[#F59E0B] hover:from-[#B45309] hover:to-[#D97706] text-white font-bold text-sm shadow-[0_4px_16px_rgba(217,119,6,0.35)] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {isSubmitting ? "hourglass_empty" : "flash_on"}
                  </span>
                  <span>{isSubmitting ? "Rezerwacja..." : "Zamów z szybkim BLIK"}</span>
                </button>
              </div>
            </div>
          </form>
        </main>
      </div>
    </>
  );
}
