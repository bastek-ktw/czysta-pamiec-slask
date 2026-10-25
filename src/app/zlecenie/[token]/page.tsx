"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Order, Cemetery } from "@/lib/types";
import { compressImageToWebP } from "@/lib/imageCompressor";

export default function ContractorOrderPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [order, setOrder] = useState<Order | null>(null);
  const [cemetery, setCemetery] = useState<Cemetery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Stany zdjęć
  const [isUploadingBefore, setIsUploadingBefore] = useState(false);
  const [isUploadingAfter, setIsUploadingAfter] = useState(false);
  const [notes, setNotes] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/contractor/${token}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.ok && res.data) {
          setOrder(res.data.order);
          setCemetery(res.data.cemeteryDetails);
          if (res.data.order.contractorNotes) {
            setNotes(res.data.order.contractorNotes);
          }
        } else {
          setErrorMsg(res.error || "Nie znaleziono zlecenia.");
        }
      })
      .catch((err) => setErrorMsg("Błąd połączenia z serwerem."))
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleUploadPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "before" | "after"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (type === "before") setIsUploadingBefore(true);
      else setIsUploadingAfter(true);

      const webpDataUrl = await compressImageToWebP(file, 1000, 95000);

      const payload = type === "before"
        ? { photoBeforeDataUrl: webpDataUrl }
        : { photoAfterDataUrl: webpDataUrl };

      const res = await fetch(`/api/contractor/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.ok && json.data) {
        setOrder(json.data);
      }
    } catch (err: any) {
      alert("Błąd podczas wgrywania zdjęcia: " + err.message);
    } finally {
      if (type === "before") setIsUploadingBefore(false);
      else setIsUploadingAfter(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!order?.photoBeforeDataUrl || !order?.photoAfterDataUrl) {
      alert("Wymagane jest wgranie OBU zdjęć (Przed myciem oraz Po umyciu) przed zakończeniem zlecenia!");
      return;
    }

    try {
      const res = await fetch(`/api/contractor/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorNotes: notes,
          isCompleted: true
        })
      });

      const json = await res.json();
      if (json.ok && json.data) {
        setOrder(json.data);
        setSaveSuccess(true);
      }
    } catch (err: any) {
      alert("Błąd zakończenia zlecenia: " + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface text-xs font-semibold text-on-surface-variant">
        Ładowanie karty zlecenia dla ekipy terenowej...
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
        <div className="bg-surface-container-lowest p-6 rounded-2xl max-w-sm w-full text-center space-y-3 border">
          <span className="material-symbols-outlined text-[36px] text-error">error</span>
          <h1 className="font-bold text-primary">Nie znaleziono zlecenia</h1>
          <p className="text-xs text-on-surface-variant">{errorMsg || "Błędny token zlecenia."}</p>
        </div>
      </div>
    );
  }

  const mapsUrl = cemetery?.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(order.cemeteryName)}`;
  const grobonetUrl = cemetery?.grobonetUrl || order.grobonetLink || "https://grobonet.com";

  return (
    <div className="min-h-screen bg-surface pb-16">
      {/* Pasek Wykonawcy */}
      <header className="bg-primary text-white p-4 sticky top-0 z-30 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold bg-white/20 px-2 py-0.5 rounded">
                {order.id}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                order.status === "completed" ? "bg-living-ivy text-white" : "bg-secondary text-white"
              }`}>
                {order.status === "completed" ? "UKOŃCZONE" : "DO REALIZACJI"}
              </span>
            </div>
            <h1 className="font-serif-title text-base font-bold mt-1">Karta Zadania Terenowego</h1>
          </div>

          <span className="text-xs text-white/80 font-mono">
            {order.slotDate} • {order.slotTime}
          </span>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {saveSuccess && (
          <div className="p-4 bg-living-ivy/15 text-living-ivy rounded-xl border border-living-ivy/30 text-xs font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">verified</span>
            <span>Zlecenie zostało oznaczone jako zakończone! Raport foto gotowy.</span>
          </div>
        )}

        {/* 1. Nawigacja do Cmentarza */}
        <section className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 space-y-2.5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
              Lokalizacja Cmentarza
            </span>
            <h2 className="font-bold text-base text-primary">{order.cemeteryName}</h2>
            <p className="text-xs text-on-surface-variant">{cemetery?.address || order.city}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-3 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[16px]">navigation</span>
              <span>Nawiguj (GPS)</span>
            </a>

            <a
              href={grobonetUrl}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-bold text-xs flex items-center justify-center gap-1.5 border border-outline-variant/30 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[16px]">search</span>
              <span>Baza Grobonet</span>
            </a>
          </div>
        </section>

        {/* 2. Namierzenie Mogiły */}
        <section className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
            Identyfikacja Mogiły
          </span>

          <div className="bg-surface-container-low p-3 rounded-lg text-xs space-y-1.5">
            {order.deceasedName && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Osoba pochowana:</span>
                <strong className="text-primary text-sm">{order.deceasedName}</strong>
              </div>
            )}
            {order.sectorInfo && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Sektor / Rząd / Grób:</span>
                <strong className="text-primary">{order.sectorInfo}</strong>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Typ płyty:</span>
              <span className="font-semibold text-primary">{order.graveType}</span>
            </div>
          </div>

          {order.gravePhotoDataUrl && (
            <div className="space-y-1 pt-1">
              <span className="text-xs text-on-surface-variant block font-medium">
                Zdjęcie orientacyjne od klienta:
              </span>
              <div className="rounded-xl overflow-hidden border border-outline-variant">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={order.gravePhotoDataUrl}
                  alt="Zdjęcie od klienta"
                  className="w-full max-h-56 object-cover"
                />
              </div>
            </div>
          )}
        </section>

        {/* 3. Checklista Zadań do Wykonania */}
        <section className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 space-y-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
            Zadania do zrobienia (Checklista)
          </span>

          <div className="space-y-2">
            <div className="p-2.5 rounded-lg bg-surface-container-low flex items-start gap-2.5 text-xs">
              <span className="material-symbols-outlined text-primary text-[20px] shrink-0">check_box</span>
              <div>
                <strong className="text-primary block">{order.packageName}</strong>
                <span className="text-[11px] text-on-surface-variant">
                  Dokładne mycie kamienia, usunięcie starych wkładów, zamiecenie igliwia.
                </span>
              </div>
            </div>

            {order.addons.map((add) => (
              <div
                key={add.id}
                className="p-2.5 rounded-lg bg-surface-container-low flex items-start gap-2.5 text-xs border-l-4 border-secondary"
              >
                <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">
                  featured_seasonal_and_gifts
                </span>
                <div>
                  <strong className="text-primary block">
                    {add.name} (Ilość: {add.quantity})
                  </strong>
                  <span className="text-[11px] text-on-surface-variant">
                    Postawić na nagrobku w estetycznym układzie.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Moduł Aparatu – Zdjęcia PRZED i PO */}
        <section className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 space-y-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
              Dokumentacja Fotograficzna
            </span>
            <h3 className="font-bold text-sm text-primary">Wgraj zdjęcia z terenu</h3>
            <p className="text-[11px] text-on-surface-variant">
              Zdjęcia zostaną skompresowane w telefonie i automatycznie trafią do raportu dla klienta.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Zdjęcie PRZED */}
            <div className="border border-outline-variant/40 rounded-xl p-3 bg-surface-container-low text-center flex flex-col items-center justify-between min-h-[160px]">
              <span className="text-xs font-bold text-primary block">1. Zdjęcie PRZED</span>
              {order.photoBeforeDataUrl ? (
                <div className="my-1.5 relative w-full h-24 rounded-lg overflow-hidden border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={order.photoBeforeDataUrl}
                    alt="Przed myciem"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center my-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                </div>
              )}

              <label className="w-full py-2 px-2 rounded-lg bg-primary text-white text-[11px] font-bold cursor-pointer hover:bg-primary-container transition-colors block">
                {isUploadingBefore ? "Zapis..." : order.photoBeforeDataUrl ? "Zmień foto" : "Zrób zdjęcie PRZED"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleUploadPhoto(e, "before")}
                  disabled={isUploadingBefore}
                  className="hidden"
                />
              </label>
            </div>

            {/* Zdjęcie PO */}
            <div className="border border-outline-variant/40 rounded-xl p-3 bg-surface-container-low text-center flex flex-col items-center justify-between min-h-[160px]">
              <span className="text-xs font-bold text-primary block">2. Zdjęcie PO</span>
              {order.photoAfterDataUrl ? (
                <div className="my-1.5 relative w-full h-24 rounded-lg overflow-hidden border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={order.photoAfterDataUrl}
                    alt="Po myciu"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant flex items-center justify-center my-2">
                  <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                </div>
              )}

              <label className="w-full py-2 px-2 rounded-lg bg-secondary text-white text-[11px] font-bold cursor-pointer hover:bg-secondary/90 transition-colors block">
                {isUploadingAfter ? "Zapis..." : order.photoAfterDataUrl ? "Zmień foto" : "Zrób zdjęcie PO"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleUploadPhoto(e, "after")}
                  disabled={isUploadingAfter}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Notatki wykonawcy */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Notatka z realizacji (opcjonalnie)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="np. Kamień zaimpregnowany, znicze zapalone"
              className="w-full h-10 px-3 rounded-lg bg-surface-container-low border text-xs"
            />
          </div>

          {/* Przycisk Zakończenia */}
          <button
            type="button"
            onClick={handleCompleteOrder}
            disabled={order.status === "completed"}
            className={`w-full py-3.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all ${
              order.status === "completed"
                ? "bg-living-ivy opacity-90 cursor-default"
                : "bg-primary hover:bg-primary-container active:scale-95"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {order.status === "completed" ? "check_circle" : "task_alt"}
            </span>
            <span>
              {order.status === "completed" ? "Zlecenie Ukończone" : "Zatwierdź i Zakończ Zlecenie"}
            </span>
          </button>
        </section>
      </main>
    </div>
  );
}
