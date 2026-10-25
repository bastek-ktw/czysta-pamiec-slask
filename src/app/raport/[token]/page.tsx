"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Order } from "@/lib/types";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";

export default function ClientReportPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/contractor/${token}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.ok && res.data) {
          setOrder(res.data.order);
        } else {
          setErrorMsg(res.error || "Nie znaleziono raportu.");
        }
      })
      .catch(() => setErrorMsg("Błąd połączenia."))
      .finally(() => setIsLoading(false));
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface text-xs font-semibold text-on-surface-variant">
        Ładowanie raportu fotograficznego...
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
        <div className="bg-surface-container-lowest p-6 rounded-2xl max-w-sm w-full text-center space-y-3 border">
          <span className="material-symbols-outlined text-[36px] text-error">error</span>
          <h1 className="font-bold text-primary">Nie znaleziono raportu</h1>
          <p className="text-xs text-on-surface-variant">{errorMsg || "Raport nie istnieje."}</p>
        </div>
      </div>
    );
  }

  const hasBothPhotos = Boolean(order.photoBeforeDataUrl && order.photoAfterDataUrl);

  return (
    <div className="min-h-screen bg-surface pb-16">
      {/* Nagłówek */}
      <header className="bg-primary text-white p-4 sticky top-0 z-30 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px] text-secondary-fixed">verified</span>
            </div>
            <div>
              <h1 className="font-serif-title text-base font-bold">Raport Realizacji Pielęgnacji</h1>
              <span className="text-[11px] text-white/70 block">Czysta Pamięć • Górny Śląsk</span>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-white/20 px-2 py-0.5 rounded">
            {order.id}
          </span>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {/* Status i Podziękowanie */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-living-ivy/15 text-living-ivy flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[28px]">check_circle</span>
          </div>
          <h2 className="font-serif-title text-2xl font-bold text-primary">
            Dziękujemy za zaufanie
          </h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Nagrobek na cmentarzu <strong>{order.cemeteryName}</strong> został z należytą czcią
            i starannością umyty oraz przygotowany na dzień Wszystkich Świętych.
          </p>
          {order.completedAt && (
            <span className="inline-block text-[11px] font-semibold text-living-ivy bg-living-ivy/10 px-3 py-1 rounded-full mt-1">
              Data realizacji: {new Date(order.completedAt).toLocaleString("pl-PL", { dateStyle: "long", timeStyle: "short" })}
            </span>
          )}
        </div>

        {/* Porównanie Fotograficzne PRZED / PO */}
        <section className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif-title text-lg font-bold text-primary">
              Dokumentacja Fotograficzna
            </h3>
            <span className="text-xs font-semibold text-secondary">Przed i Po</span>
          </div>

          {hasBothPhotos ? (
            <BeforeAfterSlider
              beforeImage={order.photoBeforeDataUrl}
              afterImage={order.photoAfterDataUrl}
              beforeLabel="Stan przed rozpoczęciem"
              afterLabel="Stan po umyciu i dekoracji"
            />
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-surface-container-low rounded-lg text-center">
                <span className="block font-bold mb-1">Przed pracami</span>
                {order.photoBeforeDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={order.photoBeforeDataUrl} alt="Przed" className="w-full h-32 object-cover rounded" />
                ) : (
                  <span className="text-on-surface-variant italic">Brak zdjęcia</span>
                )}
              </div>
              <div className="p-2 bg-surface-container-low rounded-lg text-center">
                <span className="block font-bold mb-1">Po wykonaniu</span>
                {order.photoAfterDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={order.photoAfterDataUrl} alt="Po" className="w-full h-32 object-cover rounded" />
                ) : (
                  <span className="text-on-surface-variant italic">W trakcie realizacji</span>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Szczegóły Wykonanej Usługi */}
        <section className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 space-y-2.5 text-xs">
          <h3 className="font-serif-title text-base font-bold text-primary">Wykonany zakres prac</h3>

          <div className="space-y-1.5 divide-y divide-outline-variant/20">
            <div className="flex justify-between pt-1">
              <span className="text-on-surface-variant">Pakiet pielęgnacji:</span>
              <strong className="text-primary">{order.packageName}</strong>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-on-surface-variant">Lokalizacja:</span>
              <span className="font-semibold text-primary">{order.cemeteryName} ({order.city})</span>
            </div>
            {order.deceasedName && (
              <div className="flex justify-between pt-1">
                <span className="text-on-surface-variant">Osoba upamiętniona:</span>
                <span className="font-semibold text-primary">{order.deceasedName}</span>
              </div>
            )}
            {order.addons.length > 0 && (
              <div className="pt-1">
                <span className="text-on-surface-variant block font-medium">Postawione kwiaty i znicze:</span>
                <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-primary">
                  {order.addons.map((a) => (
                    <li key={a.id}>
                      {a.name} (x{a.quantity})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {order.contractorNotes && (
              <div className="pt-2">
                <span className="text-on-surface-variant block font-medium">Notatka ekipy terenowej:</span>
                <p className="bg-surface-container-low p-2 rounded mt-1 italic text-primary">
                  &quot;{order.contractorNotes}&quot;
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Infolinia i Zamów ponownie */}
        <div className="text-center p-4 bg-surface-container-low rounded-2xl space-y-2 text-xs">
          <p className="text-on-surface-variant">
            W razie pytań zapraszamy do kontaktu z naszą infolinią:
          </p>
          <a
            href="tel:+48327201101"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white font-bold"
          >
            <span className="material-symbols-outlined text-[18px]">call</span>
            <span>+48 32 720 11 01</span>
          </a>

          <div className="pt-2">
            <Link href="/" className="text-xs text-secondary font-bold underline">
              Złóż nowe zamówienie dla innego nagrobka
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
