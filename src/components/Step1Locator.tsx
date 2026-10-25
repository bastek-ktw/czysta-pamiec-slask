"use client";

import { useState } from "react";
import cemeteriesData from "@/data/cemeteries.json";
import { Cemetery, ServiceItem } from "@/lib/types";
import { compressImageToWebP } from "@/lib/imageCompressor";

export interface Step1Data {
  city: string;
  cemeteryId: string;
  cemeteryName: string;
  grobonetUrl: string;
  googleMapsUrl: string;
  locationMode: "deceased" | "photo" | "sector";
  deceasedName: string;
  deathYear: string;
  sectorInfo: string;
  gravePhotoDataUrl: string;
  graveTypeId: string;
  graveTypeName: string;
  graveTypePrice: number;
}

interface Step1LocatorProps {
  initialData: Step1Data;
  graveTypes: ServiceItem[];
  onNext: (data: Step1Data) => void;
}

const CITIES = [
  "Chorzów",
  "Katowice",
  "Siemianowice Śląskie",
  "Bytom",
  "Świętochłowice",
  "Ruda Śląska"
];

export function Step1Locator({ initialData, graveTypes, onNext }: Step1LocatorProps) {
  const [data, setData] = useState<Step1Data>(initialData);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtrowane cmentarze wg wybranego miasta
  const filteredCemeteries = cemeteriesData.filter(
    (c) => c.city.toLowerCase() === data.city.toLowerCase()
  );

  const selectedCemetery = cemeteriesData.find((c) => c.id === data.cemeteryId) || filteredCemeteries[0];

  const handleCityChange = (newCity: string) => {
    const firstInCity = cemeteriesData.find((c) => c.city.toLowerCase() === newCity.toLowerCase()) || cemeteriesData[0];
    setData((prev) => ({
      ...prev,
      city: newCity,
      cemeteryId: firstInCity.id,
      cemeteryName: firstInCity.name,
      grobonetUrl: firstInCity.grobonetUrl,
      googleMapsUrl: firstInCity.googleMapsUrl
    }));
  };

  const handleCemeteryChange = (cemeteryId: string) => {
    const cem = cemeteriesData.find((c) => c.id === cemeteryId);
    if (!cem) return;
    setData((prev) => ({
      ...prev,
      cemeteryId: cem.id,
      cemeteryName: cem.name,
      grobonetUrl: cem.grobonetUrl,
      googleMapsUrl: cem.googleMapsUrl
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      setErrorMsg(null);
      const compressedWebP = await compressImageToWebP(file, 1000, 95000);
      setData((prev) => ({
        ...prev,
        gravePhotoDataUrl: compressedWebP
      }));
    } catch (err: any) {
      console.error("Compression error:", err);
      setErrorMsg("Nie udało się skompresować zdjęcia. Spróbuj wybrać inny plik.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleGraveTypeSelect = (gt: ServiceItem) => {
    setData((prev) => ({
      ...prev,
      graveTypeId: gt.id,
      graveTypeName: gt.name,
      graveTypePrice: gt.price
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (data.locationMode === "deceased" && !data.deceasedName.trim()) {
      setErrorMsg("Podaj imię i nazwisko osoby pochowanej, abyśmy mogli zlokalizować grób.");
      return;
    }
    if (data.locationMode === "photo" && !data.gravePhotoDataUrl) {
      setErrorMsg("Wgraj zdjęcie grobu lub przełącz na tryb 'Po nazwisku zmarłego'.");
      return;
    }
    if (data.locationMode === "sector" && !data.sectorInfo.trim()) {
      setErrorMsg("Podaj numer sektora, rzędu lub kwatery.");
      return;
    }

    onNext(data);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto px-4 py-4 space-y-6">
      {/* 1. Wybór Miasta */}
      <section className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-serif-title text-2xl font-bold text-primary">Wybierz miasto i cmentarz</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Górny Śląsk • Ekipa z dojazdem bez dodatkowych opłat
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[22px]">location_on</span>
          </div>
        </div>

        {/* Karuzela / Pigułki miast */}
        <div className="flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-2 px-2">
          {CITIES.map((city) => {
            const isSelected = data.city.toLowerCase() === city.toLowerCase();
            return (
              <button
                key={city}
                type="button"
                onClick={() => handleCityChange(city)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {city}
              </button>
            );
          })}
        </div>

        {/* Lista cmentarzy w wybranym mieście */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1.5">
            Cmentarz ({filteredCemeteries.length} dostępnych w {data.city})
          </label>
          <div className="relative">
            <select
              value={data.cemeteryId}
              onChange={(e) => handleCemeteryChange(e.target.value)}
              className="w-full h-12 pl-4 pr-10 rounded-lg bg-surface-container-low border border-outline-variant/40 font-medium text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
            >
              {filteredCemeteries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.address}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-3 text-on-surface-variant pointer-events-none text-[22px]">
              expand_more
            </span>
          </div>

          {selectedCemetery && (
            <div className="mt-2.5 flex items-center justify-between text-xs text-on-surface-variant bg-surface-container-low/60 p-2.5 rounded-lg border border-outline-variant/20">
              <span className="truncate">📍 {selectedCemetery.address}</span>
              <a
                href={selectedCemetery.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-secondary hover:underline font-semibold ml-2 shrink-0 flex items-center gap-1"
              >
                Nawiguj <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            </div>
          )}
        </div>
      </section>

      {/* 2. Trzy tryby wskazania grobu */}
      <section className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30">
        <div className="mb-3">
          <h3 className="font-serif-title text-xl font-bold text-primary">Identyfikacja grobu</h3>
          <p className="text-xs text-on-surface-variant">
            Wybierz najwygodniejszy dla Ciebie sposób wskazania mogiły
          </p>
        </div>

        {/* Zakładki trybów */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-container-low rounded-xl mb-4">
          <button
            type="button"
            onClick={() => setData((p) => ({ ...p, locationMode: "deceased" }))}
            className={`py-2 px-1 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all ${
              data.locationMode === "deceased"
                ? "bg-white text-primary shadow-sm"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">person_search</span>
            <span className="truncate">Nazwisko</span>
          </button>

          <button
            type="button"
            onClick={() => setData((p) => ({ ...p, locationMode: "photo" }))}
            className={`py-2 px-1 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all ${
              data.locationMode === "photo"
                ? "bg-white text-primary shadow-sm"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">photo_camera</span>
            <span className="truncate">Zdjęcie / Mapa</span>
          </button>

          <button
            type="button"
            onClick={() => setData((p) => ({ ...p, locationMode: "sector" }))}
            className={`py-2 px-1 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all ${
              data.locationMode === "sector"
                ? "bg-white text-primary shadow-sm"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">grid_view</span>
            <span className="truncate">Sektor / Rząd</span>
          </button>
        </div>

        {/* Tryb A: Nazwisko zmarłego + Grobonet */}
        {data.locationMode === "deceased" && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-primary-fixed/30 border border-primary-fixed text-primary text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px] shrink-0">
                  sync_saved_locally
                </span>
                <span>Automatyczny deep-link do bazy cmentarnej Grobonet dla wykonawcy</span>
              </div>
              {selectedCemetery?.grobonetUrl && (
                <a
                  href={selectedCemetery.grobonetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-primary text-white font-semibold text-[11px] shrink-0 flex items-center gap-1"
                >
                  Grobonet <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                </a>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                Imię i nazwisko osoby pochowanej *
              </label>
              <div className="relative">
                <span className="material-symbols-outlined text-outline absolute left-3 top-3 text-[20px]">
                  person
                </span>
                <input
                  type="text"
                  value={data.deceasedName}
                  onChange={(e) => setData((p) => ({ ...p, deceasedName: e.target.value }))}
                  placeholder="np. Jan Kowalski lub Maria Nowak-Kowalska"
                  className="w-full h-12 pl-10 pr-3 rounded-lg bg-surface-container-low border border-outline-variant/40 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                Przybliżony rok śmierci lub pochówku (opcjonalnie)
              </label>
              <input
                type="text"
                value={data.deathYear}
                onChange={(e) => setData((p) => ({ ...p, deathYear: e.target.value }))}
                placeholder="np. 2018 lub lata 90-te"
                className="w-full h-12 px-3 rounded-lg bg-surface-container-low border border-outline-variant/40 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {/* Tryb B: Zdjęcie grobu / Zrzut ekranu */}
        {data.locationMode === "photo" && (
          <div className="space-y-3">
            <p className="text-xs text-on-surface-variant">
              Wgraj zdjęcie grobu z zeszłego roku lub zrzut ekranu z pinezką. Zdjęcie zostanie
              automatycznie zoptymalizowane w telefonie (&lt;100 KB).
            </p>

            <div className="border-2 border-dashed border-outline-variant/60 rounded-xl p-5 bg-surface-container-low text-center flex flex-col items-center justify-center relative hover:bg-surface-container transition-colors">
              {data.gravePhotoDataUrl ? (
                <div className="space-y-2 w-full">
                  <div className="relative w-40 h-32 mx-auto rounded-lg overflow-hidden border border-outline-variant shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data.gravePhotoDataUrl}
                      alt="Zdjęcie grobu"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-xs text-living-ivy font-semibold flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Zdjęcie wgrane i zoptymalizowane (WebP)
                  </p>
                  <label className="inline-block text-xs text-secondary font-semibold underline cursor-pointer mt-1">
                    Zmień zdjęcie
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center w-full">
                  <div className="w-12 h-12 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-[26px]">add_a_photo</span>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {isCompressing ? "Optymalizacja zdjęcia..." : "Dotknij, aby wgrać zdjęcie"}
                  </span>
                  <span className="text-xs text-on-surface-variant mt-1">
                    Aparat w telefonie lub plik z galerii
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={isCompressing}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* Tryb C: Sektor / Rząd / Numer grobu */}
        {data.locationMode === "sector" && (
          <div className="space-y-3">
            <p className="text-xs text-on-surface-variant">
              Wprowadź oznaczenia z księgi cmentarnej lub tabliczki przy grobie.
            </p>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                Kwatera / Sektor / Rząd / Numer grobu *
              </label>
              <input
                type="text"
                value={data.sectorInfo}
                onChange={(e) => setData((p) => ({ ...p, sectorInfo: e.target.value }))}
                placeholder="np. Sektor B3, Rząd 4, Grób 12 (kwatera dziecięca)"
                className="w-full h-12 px-3 rounded-lg bg-surface-container-low border border-outline-variant/40 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        )}
      </section>

      {/* 3. Typ i wielkość nagrobka */}
      <section className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30">
        <div className="mb-3">
          <h3 className="font-serif-title text-xl font-bold text-primary">Typ i wielkość nagrobka</h3>
          <p className="text-xs text-on-surface-variant">
            Wpływa na ilość potrzebnych środków czyszczących oraz czas pracy ekipy
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {graveTypes.map((gt) => {
            const isSelected = data.graveTypeId === gt.id;
            return (
              <button
                key={gt.id}
                type="button"
                onClick={() => handleGraveTypeSelect(gt)}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start justify-between gap-3 ${
                  isSelected
                    ? "border-primary bg-primary-fixed/20 shadow-sm"
                    : "border-outline-variant/40 bg-surface-container-low hover:bg-surface-container"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary">{gt.name}</span>
                    {gt.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-bold">
                        {gt.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">{gt.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-xs font-bold text-primary">
                    {gt.price === 0 ? "W cenie" : gt.price > 0 ? `+${gt.price} zł` : `${gt.price} zł`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Komunikat błędu */}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-error-container text-error text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-0 left-0 right-0 py-3 bg-surface/95 backdrop-blur-md border-t border-outline-variant/30 z-30 -mx-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="text-left">
            <span className="text-xs text-on-surface-variant block">Krok 1 z 3</span>
            <span className="text-sm font-bold text-primary truncate block max-w-[180px] sm:max-w-none">
              {data.cemeteryName || "Wybierz cmentarz"}
            </span>
          </div>

          <button
            type="submit"
            className="h-12 px-6 rounded-xl bg-primary hover:bg-primary-container text-white font-semibold text-sm flex items-center gap-2 shadow-md transition-colors shrink-0"
          >
            <span>Dalej: Wybierz pakiet</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </form>
  );
}
