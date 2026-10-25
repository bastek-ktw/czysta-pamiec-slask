"use client";

import { useState } from "react";
import { ServiceItem, OrderAddon } from "@/lib/types";
import { BeforeAfterSlider } from "./BeforeAfterSlider";

export interface Step2Data {
  packageId: string;
  packageName: string;
  packagePrice: number;
  addons: OrderAddon[];
  isSecondGrave: boolean;
  secondGraveDeceasedName?: string;
}

interface Step2PackagesProps {
  initialData: Step2Data;
  packages: ServiceItem[];
  flowers: ServiceItem[];
  candles: ServiceItem[];
  extraAddons: ServiceItem[];
  graveTypePriceDelta: number;
  onBack: () => void;
  onNext: (data: Step2Data) => void;
}

export function Step2Packages({
  initialData,
  packages,
  flowers,
  candles,
  extraAddons,
  graveTypePriceDelta,
  onBack,
  onNext
}: Step2PackagesProps) {
  const [data, setData] = useState<Step2Data>(initialData);

  const selectedPackage = packages.find((p) => p.id === data.packageId) || packages[0];

  const handlePackageSelect = (pkg: ServiceItem) => {
    setData((p) => ({
      ...p,
      packageId: pkg.id,
      packageName: pkg.name,
      packagePrice: pkg.price
    }));
  };

  const handleAddonToggle = (addon: ServiceItem, quantityDelta: number) => {
    setData((prev) => {
      const existing = prev.addons.find((a) => a.id === addon.id);
      const currentQty = existing ? existing.quantity : 0;
      const newQty = Math.max(0, currentQty + quantityDelta);

      let newAddons: OrderAddon[];
      if (newQty === 0) {
        newAddons = prev.addons.filter((a) => a.id !== addon.id);
      } else if (existing) {
        newAddons = prev.addons.map((a) => (a.id === addon.id ? { ...a, quantity: newQty } : a));
      } else {
        newAddons = [...prev.addons, { id: addon.id, name: addon.name, price: addon.price, quantity: newQty }];
      }

      return { ...prev, addons: newAddons };
    });
  };

  // Kalkulacja podsumowania
  const addonsTotal = data.addons.reduce((sum, a) => sum + a.price * a.quantity, 0);
  const baseTotal = (selectedPackage?.price || 0) + graveTypePriceDelta + addonsTotal;
  const multiGraveDiscount = data.isSecondGrave ? Math.round(baseTotal * 0.2) : 0;
  const currentTotal = Math.max(0, baseTotal - multiGraveDiscount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(data);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto px-4 py-4 space-y-6">
      {/* 1. Wybór Pakietu Głównego */}
      <section className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30">
        <div className="mb-4">
          <h2 className="font-serif-title text-2xl font-bold text-primary">Wybierz pakiet pielęgnacji</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Wszystkie pakiety realizowane są przez przeszkolone, 2-osobowe ekipy z dokumentacją foto
          </p>
        </div>

        <div className="space-y-3">
          {packages.map((pkg) => {
            const isSelected = data.packageId === pkg.id;
            return (
              <div
                key={pkg.id}
                onClick={() => handlePackageSelect(pkg)}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                  isSelected
                    ? "border-primary bg-primary-fixed/15 shadow-sm"
                    : "border-outline-variant/30 bg-surface-container-low hover:border-outline-variant hover:bg-surface-container"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-primary">{pkg.name}</span>
                      {pkg.badge && (
                        <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-secondary text-white font-bold">
                          {pkg.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{pkg.description}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-serif-title text-2xl font-bold text-primary">
                      {pkg.price} zł
                    </div>
                    {isSelected && (
                      <span className="text-[11px] font-bold text-primary flex items-center justify-end gap-1 mt-1">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Wybrany
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Porównanie efektu Przed / Po ze Stitcha */}
      <section className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30">
        <div className="mb-3">
          <h3 className="font-serif-title text-xl font-bold text-primary">Standard jakości wykonania</h3>
          <p className="text-xs text-on-surface-variant">
            Używamy bezpiecznych preparatów biodegradowalnych, które nie niszczą złoceń ani kamienia
          </p>
        </div>

        <BeforeAfterSlider />
      </section>

      {/* 3. Żywe Kwiaty i Wiązanki */}
      <section className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-serif-title text-xl font-bold text-primary">Świeże kwiaty i wiązanki</h3>
            <p className="text-xs text-on-surface-variant">
              Dostarczane bezpośrednio na nagrobek w dniu mycia
            </p>
          </div>
          <span className="material-symbols-outlined text-primary text-[24px]">local_florist</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {flowers.map((fl) => {
            const current = data.addons.find((a) => a.id === fl.id);
            const qty = current ? current.quantity : 0;
            return (
              <div
                key={fl.id}
                className="p-3.5 rounded-xl border border-outline-variant/30 bg-surface-container-low flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-primary">{fl.name}</span>
                    {fl.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed-variant font-bold">
                        {fl.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">{fl.description}</p>
                  <span className="text-xs font-bold text-primary mt-1 block">{fl.price} zł</span>
                </div>

                {/* Kontroler ilości */}
                <div className="flex items-center gap-1.5 shrink-0 bg-white rounded-lg p-1 border border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => handleAddonToggle(fl, -1)}
                    disabled={qty === 0}
                    className="w-7 h-7 rounded flex items-center justify-center text-primary hover:bg-surface-container disabled:opacity-30 disabled:pointer-events-none"
                  >
                    -
                  </button>
                  <span className="w-5 text-center text-xs font-bold">{qty}</span>
                  <button
                    type="button"
                    onClick={() => handleAddonToggle(fl, 1)}
                    className="w-7 h-7 rounded flex items-center justify-center bg-primary text-white hover:bg-primary-container font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Znicze Pamięci (w tym Ruch Chorzów "PAMIĘTAMY") */}
      <section className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-serif-title text-xl font-bold text-primary">Znicze pamięci</h3>
            <p className="text-xs text-on-surface-variant">
              Postawione i zapalone przez naszego pracownika po zakończeniu prac
            </p>
          </div>
          <span className="material-symbols-outlined text-secondary text-[24px]">local_fire_department</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {candles.map((cd) => {
            const current = data.addons.find((a) => a.id === cd.id);
            const qty = current ? current.quantity : 0;
            const isSpecial = cd.id === "cd-rucho-special";
            return (
              <div
                key={cd.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                  isSpecial
                    ? "border-blue-600/40 bg-blue-50/50"
                    : "border-outline-variant/30 bg-surface-container-low"
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-primary">{cd.name}</span>
                    {cd.badge && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        isSpecial
                          ? "bg-blue-600 text-white"
                          : "bg-secondary-fixed text-on-secondary-fixed-variant"
                      }`}>
                        {cd.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">{cd.description}</p>
                  <span className="text-xs font-bold text-primary mt-1 block">{cd.price} zł</span>
                </div>

                {/* Kontroler ilości */}
                <div className="flex items-center gap-1.5 shrink-0 bg-white rounded-lg p-1 border border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => handleAddonToggle(cd, -1)}
                    disabled={qty === 0}
                    className="w-7 h-7 rounded flex items-center justify-center text-primary hover:bg-surface-container disabled:opacity-30 disabled:pointer-events-none"
                  >
                    -
                  </button>
                  <span className="w-5 text-center text-xs font-bold">{qty}</span>
                  <button
                    type="button"
                    onClick={() => handleAddonToggle(cd, 1)}
                    className="w-7 h-7 rounded flex items-center justify-center bg-primary text-white hover:bg-primary-container font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Usługi Dodatkowe */}
      <section className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30">
        <div className="mb-3">
          <h3 className="font-serif-title text-xl font-bold text-primary">Dodatkowe zabiegi konserwacji</h3>
          <p className="text-xs text-on-surface-variant">Zabezpieczenie kamienia i renowacja detali</p>
        </div>

        <div className="space-y-2">
          {extraAddons.map((ad) => {
            const isAdded = data.addons.some((a) => a.id === ad.id);
            return (
              <div
                key={ad.id}
                onClick={() => handleAddonToggle(ad, isAdded ? -1 : 1)}
                className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isAdded
                    ? "border-primary bg-primary-fixed/20"
                    : "border-outline-variant/30 bg-surface-container-low hover:bg-surface-container"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`material-symbols-outlined text-[20px] ${isAdded ? "text-primary" : "text-outline"}`}>
                    {isAdded ? "check_box" : "check_box_outline_blank"}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-primary block">{ad.name}</span>
                    <span className="text-[11px] text-on-surface-variant">{ad.description}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-primary shrink-0">+{ad.price} zł</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. Rabat Wielogrobowy (-20%) */}
      <section className="bg-gradient-to-r from-secondary-fixed/50 to-surface-container-low rounded-xl p-4 border border-secondary/30">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.isSecondGrave}
            onChange={(e) => setData((p) => ({ ...p, isSecondGrave: e.target.checked }))}
            className="w-5 h-5 rounded text-primary focus:ring-primary mt-0.5"
          />
          <div className="space-y-1">
            <span className="text-xs font-bold text-primary block">
              Zlecam sprzątanie 2. grobu na tym samym cmentarzu (-20% rabatu!)
            </span>
            <p className="text-[11px] text-on-surface-variant">
              Dojazd ekipy w to samo miejsce obniża koszty logistyki – oszczędzasz 20% na całym zamówieniu drugiego grobu.
            </p>
            {data.isSecondGrave && (
              <input
                type="text"
                placeholder="Imię i nazwisko na 2. grobie (np. Helena Kowalska)"
                value={data.secondGraveDeceasedName || ""}
                onChange={(e) => setData((p) => ({ ...p, secondGraveDeceasedName: e.target.value }))}
                className="w-full h-10 px-3 mt-2 rounded bg-white border border-outline-variant text-xs focus:ring-1 focus:ring-primary"
              />
            )}
          </div>
        </label>
      </section>

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-0 left-0 right-0 py-3 bg-surface/95 backdrop-blur-md border-t border-outline-variant/30 z-30 -mx-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="h-12 px-4 rounded-xl border border-outline-variant/40 bg-white text-primary font-semibold text-xs flex items-center gap-1 hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span className="hidden sm:inline">Wróć</span>
          </button>

          <div className="text-right">
            <span className="text-xs text-on-surface-variant block">Szacowany koszt:</span>
            <div className="flex items-baseline justify-end gap-1.5">
              {multiGraveDiscount > 0 && (
                <span className="text-xs text-secondary line-through font-semibold">
                  {baseTotal} zł
                </span>
              )}
              <span className="font-serif-title text-xl font-bold text-primary">
                {currentTotal} zł
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="h-12 px-6 rounded-xl bg-primary hover:bg-primary-container text-white font-semibold text-sm flex items-center gap-2 shadow-md transition-colors shrink-0"
          >
            <span>Dalej: Wybierz termin</span>
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
          </button>
        </div>
      </div>
    </form>
  );
}
