"use client";

import { useState, useEffect } from "react";
import { TimeSlot, Order, OrderAddon, SystemSettings } from "@/lib/types";
import { Step1Data } from "./Step1Locator";
import { Step2Data } from "./Step2Packages";
import { OrderSuccessModal } from "./OrderSuccessModal";

interface Step3CheckoutProps {
  step1: Step1Data;
  step2: Step2Data;
  settings: SystemSettings;
  onBack: () => void;
  onReset: () => void;
}

const AVAILABLE_DATES = [
  { date: "2026-10-25", label: "25 Paź", dayName: "Niedziela" },
  { date: "2026-10-26", label: "26 Paź", dayName: "Poniedziałek" },
  { date: "2026-10-27", label: "27 Paź", dayName: "Wtorek" },
  { date: "2026-10-28", label: "28 Paź", dayName: "Środa" },
  { date: "2026-10-29", label: "29 Paź", dayName: "Czwartek" },
  { date: "2026-10-30", label: "30 Paź", dayName: "Piątek" },
  { date: "2026-10-31", label: "31 Paź", dayName: "Sobota (Wigilia)" },
  { date: "2026-11-01", label: "01 Lis", dayName: "Niedziela (Wszystkich Świętych)" }
];

export function Step3Checkout({
  step1,
  step2,
  settings,
  onBack,
  onReset
}: Step3CheckoutProps) {
  const [selectedDate, setSelectedDate] = useState("2026-10-31");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Dane klienta
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"blik_manual" | "stripe">("blik_manual");

  // Kody rabatowe
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Stan zamówienia
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Pobieranie slotów przy zmianie daty
  useEffect(() => {
    let isMounted = true;
    setIsLoadingSlots(true);

    fetch(`/api/slots?date=${selectedDate}`)
      .then((res) => res.json())
      .then((res) => {
        if (isMounted && res.ok && res.data) {
          setSlots(res.data);
          // Jeśli wybrana godzina nie jest dostępna w nowym dniu, zresetuj
          const found = res.data.find((s: TimeSlot) => s.time === selectedTime && s.status !== "sold_out");
          if (!found) {
            const firstAvailable = res.data.find((s: TimeSlot) => s.status !== "sold_out");
            setSelectedTime(firstAvailable ? firstAvailable.time : null);
          }
        }
      })
      .catch((err) => console.error("Error fetching slots:", err))
      .finally(() => {
        if (isMounted) setIsLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  // Kalkulacja cen
  const addonsTotal = step2.addons.reduce((sum, a) => sum + a.price * a.quantity, 0);
  const subtotal = step2.packagePrice + step1.graveTypePrice + addonsTotal;

  // Rabat na 2. grób
  const multiGraveDiscount = step2.isSecondGrave
    ? Math.round((subtotal * settings.multiGraveDiscountPercent) / 100)
    : 0;

  // Rabat z kodu promocyjnego
  const promoDiscount = appliedPromo
    ? Math.round(((subtotal - multiGraveDiscount) * settings.promoDiscountPercent) / 100)
    : 0;

  const totalDiscount = multiGraveDiscount + promoDiscount;
  const finalPrice = Math.max(0, subtotal - totalDiscount);

  const handleApplyPromo = () => {
    setPromoError(null);
    if (!promoInput.trim()) return;

    if (promoInput.trim().toUpperCase() === settings.promoCode.toUpperCase()) {
      setAppliedPromo(settings.promoCode);
      setPromoInput("");
    } else {
      setPromoError("Nieprawidłowy kod promocyjny.");
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedTime) {
      setSubmitError("Wybierz godzinę realizacji zlecenia.");
      return;
    }
    if (!customerName.trim()) {
      setSubmitError("Podaj swoje imię i nazwisko.");
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 9) {
      setSubmitError("Podaj poprawny numer telefonu do kontaktu i potwierdzenia BLIK.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        city: step1.city,
        cemeteryId: step1.cemeteryId,
        cemeteryName: step1.cemeteryName,
        graveType: step1.graveTypeName,
        graveLocationMode: step1.locationMode,
        deceasedName: step1.deceasedName || undefined,
        sectorInfo: step1.sectorInfo || undefined,
        gravePhotoDataUrl: step1.gravePhotoDataUrl || undefined,
        grobonetLink: step1.grobonetUrl || undefined,
        packageId: step2.packageId,
        packageName: step2.packageName,
        packagePrice: step2.packagePrice,
        addons: step2.addons,
        totalPrice: finalPrice,
        discountApplied: totalDiscount,
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
        throw new Error(json.error || "Nie udało się zapisać rezerwacji.");
      }

      setCreatedOrder(json.data);
    } catch (err: any) {
      console.error("Order submit error:", err);
      setSubmitError(err.message || "Błąd podczas składania zamówienia. Spróbuj ponownie.");
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
          onClose={() => {
            setCreatedOrder(null);
            onReset();
          }}
        />
      )}

      <form onSubmit={handleOrderSubmit} className="w-full max-w-4xl mx-auto px-4 py-4 space-y-6">
        {/* 1. Wybór Terminu i Kalendarz (Limit 2 / h) */}
        <section className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
              <h2 className="font-serif-title text-2xl font-bold text-primary">Wybierz termin wykonania</h2>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Twardy limit: Maksymalnie 2 nagrobki na godzinę dla zachowania najwyższej precyzji mycia
            </p>
          </div>

          {/* Wybór dnia */}
          <div className="flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-2 px-2">
            {AVAILABLE_DATES.map((d) => {
              const isSelected = selectedDate === d.date;
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setSelectedDate(d.date)}
                  className={`p-3 rounded-xl text-center min-w-[100px] shrink-0 border transition-all ${
                    isSelected
                      ? "border-primary bg-primary text-white shadow-sm"
                      : "border-outline-variant/30 bg-surface-container-low text-on-surface hover:bg-surface-container"
                  }`}
                >
                  <span className={`text-[10px] uppercase font-bold block ${isSelected ? "text-secondary-fixed" : "text-on-surface-variant"}`}>
                    {d.dayName}
                  </span>
                  <span className="text-sm font-bold block mt-0.5">{d.label}</span>
                </button>
              );
            })}
          </div>

          {/* Siatka slotów godzinowych dla wybranego dnia */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-on-surface-variant uppercase">
                Dostępne godziny ({selectedDate}):
              </span>
              <div className="flex items-center gap-3 text-[11px] text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-living-ivy"></span> Dostępny
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span> Ostatnie miejsce
                </span>
                <span className="flex items-center gap-1 opacity-50">
                  <span className="w-2 h-2 rounded-full bg-outline"></span> Wyprzedany
                </span>
              </div>
            </div>

            {isLoadingSlots ? (
              <div className="py-8 text-center text-xs text-on-surface-variant">
                Sprawdzanie dostępności slotów...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {slots.map((slot) => {
                  const isSelected = selectedTime === slot.time;
                  const isSoldOut = slot.status === "sold_out";
                  const isLastSpot = slot.status === "last_spot";

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={isSoldOut}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`p-2.5 rounded-xl border text-center transition-all relative ${
                        isSoldOut
                          ? "border-outline-variant/20 bg-surface-container-low/40 opacity-40 cursor-not-allowed"
                          : isSelected
                          ? "border-primary bg-primary text-white shadow-md"
                          : isLastSpot
                          ? "border-secondary/40 bg-secondary-fixed/20 hover:border-secondary"
                          : "border-outline-variant/30 bg-surface-container-low hover:bg-surface-container"
                      }`}
                    >
                      <span className={`text-base font-bold block ${isSelected ? "text-white" : "text-primary"}`}>
                        {slot.time}
                      </span>

                      {/* Status pojemności */}
                      <span
                        className={`text-[10px] font-semibold mt-1 inline-block px-1.5 py-0.5 rounded ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : isSoldOut
                            ? "text-outline"
                            : isLastSpot
                            ? "bg-secondary text-white font-bold"
                            : "bg-living-ivy/15 text-living-ivy"
                        }`}
                      >
                        {isSoldOut ? "Brak miejsc" : isLastSpot ? "Ostatnie wolne!" : `Wolne (${2 - slot.bookedCount}/2)`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* 2. Podsumowanie zamówienia i kod rabatowy */}
        <section className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 space-y-3">
          <h3 className="font-serif-title text-xl font-bold text-primary">Podsumowanie zamówienia</h3>

          <div className="space-y-2 text-xs border-b border-outline-variant/20 pb-3">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Lokalizacja:</span>
              <span className="font-semibold text-primary">{step1.cemeteryName} ({step1.city})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Nagrobek:</span>
              <span className="font-semibold text-primary">
                {step1.graveTypeName} {step1.graveTypePrice !== 0 && `(${step1.graveTypePrice > 0 ? "+" : ""}${step1.graveTypePrice} zł)`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Pakiet:</span>
              <span className="font-semibold text-primary">{step2.packageName} ({step2.packagePrice} zł)</span>
            </div>

            {step2.addons.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-on-surface-variant block font-medium">Dodatki i znicze:</span>
                {step2.addons.map((a) => (
                  <div key={a.id} className="flex justify-between pl-2 text-[11px]">
                    <span className="text-on-surface-variant">• {a.name} x{a.quantity}</span>
                    <span className="font-semibold text-primary">{a.price * a.quantity} zł</span>
                  </div>
                ))}
              </div>
            )}

            {step2.isSecondGrave && (
              <div className="flex justify-between text-secondary font-semibold pt-1">
                <span>Rabat wielogrobowy (-20% na drugi grób):</span>
                <span>-{multiGraveDiscount} zł</span>
              </div>
            )}

            {appliedPromo && (
              <div className="flex justify-between text-living-ivy font-semibold pt-1">
                <span>Kod promocyjny ({appliedPromo} -10%):</span>
                <span>-{promoDiscount} zł</span>
              </div>
            )}
          </div>

          {/* Formularz kodu rabatowego */}
          {!appliedPromo ? (
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Kod rabatowy (np. SLASK10)"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                className="h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs font-mono uppercase flex-1"
              />
              <button
                type="button"
                onClick={handleApplyPromo}
                className="h-10 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-xs font-bold transition-colors"
              >
                Dodaj
              </button>
            </div>
          ) : (
            <div className="p-2 rounded bg-living-ivy/10 text-living-ivy text-xs font-semibold flex items-center justify-between">
              <span>Aktywny kod: <strong>{appliedPromo}</strong></span>
              <button
                type="button"
                onClick={() => setAppliedPromo(null)}
                className="text-[11px] underline text-on-surface-variant"
              >
                Usuń
              </button>
            </div>
          )}

          {promoError && (
            <p className="text-[11px] text-error font-semibold">{promoError}</p>
          )}

          {/* Suma końcowa */}
          <div className="flex justify-between items-baseline pt-2">
            <span className="text-sm font-bold text-primary">Do zapłaty łącznie:</span>
            <div className="text-right">
              {totalDiscount > 0 && (
                <span className="text-xs text-on-surface-variant line-through block font-medium">
                  {subtotal} zł
                </span>
              )}
              <span className="font-serif-title text-2xl font-bold text-primary">
                {finalPrice} zł
              </span>
            </div>
          </div>
        </section>

        {/* 3. Dane Zamawiającego */}
        <section className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 space-y-3">
          <h3 className="font-serif-title text-xl font-bold text-primary">Dane zamawiającego</h3>
          <p className="text-xs text-on-surface-variant">
            Na ten numer wyślemy potwierdzenie, instrukcję przelewu BLIK oraz raport fotograficzny
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                Imię i nazwisko *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="np. Piotr Nowicki"
                className="w-full h-12 px-3 rounded-lg bg-surface-container-low border border-outline-variant/40 text-sm font-medium focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                Numer telefonu (do weryfikacji BLIK) *
              </label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="np. 500 600 700"
                className="w-full h-12 px-3 rounded-lg bg-surface-container-low border border-outline-variant/40 text-sm font-medium focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
              Adres e-mail (opcjonalnie – do raportu foto)
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="np. piotr@example.com"
              className="w-full h-12 px-3 rounded-lg bg-surface-container-low border border-outline-variant/40 text-sm font-medium focus:ring-2 focus:ring-primary"
            />
          </div>
        </section>

        {/* 4. Metoda płatności */}
        <section className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 space-y-3">
          <h3 className="font-serif-title text-xl font-bold text-primary">Wybierz sposób płatności</h3>

          <div className="space-y-2">
            {/* Express BLIK na telefon */}
            <label
              className={`p-4 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                paymentMethod === "blik_manual"
                  ? "border-primary bg-primary-fixed/20 shadow-sm"
                  : "border-outline-variant/30 bg-surface-container-low"
              }`}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === "blik_manual"}
                onChange={() => setPaymentMethod("blik_manual")}
                className="w-5 h-5 text-primary focus:ring-primary mt-0.5"
              />
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    Express BLIK na telefon (Natychmiastowa rezerwacja)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed-variant">
                    0 zł prowizji
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Złóż zamówienie i otrzymaj numer telefonu do błyskawicznego przelewu BLIK na telefon.
                  Twój termin jest rezerwowany natychmiast na 15 minut!
                </p>
              </div>
            </label>

            {/* Opcjonalny Stripe */}
            {settings.stripeEnabled && (
              <label
                className={`p-4 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                  paymentMethod === "stripe"
                    ? "border-primary bg-primary-fixed/20 shadow-sm"
                    : "border-outline-variant/30 bg-surface-container-low"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "stripe"}
                  onChange={() => setPaymentMethod("stripe")}
                  className="w-5 h-5 text-primary focus:ring-primary mt-0.5"
                />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-primary">Karta płatnicza / Apple Pay / Google Pay</span>
                  <p className="text-[11px] text-on-surface-variant">Bezpieczna płatność online przez Stripe</p>
                </div>
              </label>
            )}
          </div>
        </section>

        {/* Błąd zapisu */}
        {submitError && (
          <div className="p-3.5 rounded-xl bg-error-container text-error text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{submitError}</span>
          </div>
        )}

        {/* Sticky Bottom Action Bar */}
        <div className="sticky bottom-0 left-0 right-0 py-3 bg-surface/95 backdrop-blur-md border-t border-outline-variant/30 z-30 -mx-4 px-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="h-12 px-4 rounded-xl border border-outline-variant/40 bg-white text-primary font-semibold text-xs flex items-center gap-1 hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span className="hidden sm:inline">Wróć</span>
            </button>

            <div className="text-right">
              <span className="text-xs text-on-surface-variant block">Do zapłaty:</span>
              <span className="font-serif-title text-xl font-bold text-primary">
                {finalPrice} zł
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 px-6 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-bold text-sm flex items-center gap-2 shadow-lg transition-colors shrink-0 disabled:opacity-50"
            >
              <span>{isSubmitting ? "Blokowanie terminu..." : "Zatwierdź i zablokuj slot"}</span>
              <span className="material-symbols-outlined text-[18px]">lock</span>
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
