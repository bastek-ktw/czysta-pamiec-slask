"use client";

import { useState } from "react";
import { Order } from "@/lib/types";

interface OrderSuccessModalProps {
  order: Order;
  blikPhone: string;
  blikRecipient: string;
  onClose: () => void;
}

export function OrderSuccessModal({
  order,
  blikPhone,
  blikRecipient,
  onClose
}: OrderSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  const copyBlikData = () => {
    const text = `BLIK na telefon: ${blikPhone}\nOdbiorca: ${blikRecipient}\nKwota: ${order.totalPrice} zł\nTytuł: ${order.id}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-outline-variant/30 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Ikona i Tytuł */}
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 rounded-full bg-living-ivy/15 text-living-ivy flex items-center justify-center mx-auto mb-2">
            <span className="material-symbols-outlined text-[32px]">check_circle</span>
          </div>
          <span className="text-xs uppercase tracking-wider font-bold text-secondary">
            Rezerwacja potwierdzona
          </span>
          <h2 className="font-serif-title text-2xl font-bold text-primary">
            Termin został zablokowany!
          </h2>
          <p className="text-xs text-on-surface-variant">
            Twoje zamówienie otrzymało numer: <strong className="text-primary text-sm">{order.id}</strong>
          </p>
        </div>

        {/* Instrukcja Express BLIK na telefon */}
        <div className="bg-surface-container-low rounded-xl p-4 border border-secondary/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
              Opłać przelewem BLIK na telefon (Natychmiastowo)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed-variant">
              0 zł prowizji
            </span>
          </div>

          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Twój slot w dniu <strong>{order.slotDate} o {order.slotTime}</strong> jest zablokowany.
            Wykonaj bezpłatny przelew na telefon BLIK w swojej aplikacji bankowej:
          </p>

          <div className="space-y-1.5 bg-white p-3 rounded-lg border border-outline-variant/30 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-outline-variant/20">
              <span className="text-on-surface-variant">Numer telefonu BLIK:</span>
              <strong className="text-primary text-sm font-mono">{blikPhone}</strong>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-outline-variant/20">
              <span className="text-on-surface-variant">Odbiorca:</span>
              <span className="font-semibold text-primary">{blikRecipient}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-outline-variant/20">
              <span className="text-on-surface-variant">Kwota do zapłaty:</span>
              <strong className="font-serif-title text-base text-primary">{order.totalPrice} zł</strong>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-on-surface-variant">Tytuł przelewu:</span>
              <strong className="text-secondary font-mono bg-secondary-fixed/40 px-2 py-0.5 rounded text-sm">
                {order.id}
              </strong>
            </div>
          </div>

          <button
            type="button"
            onClick={copyBlikData}
            className="w-full py-2.5 px-3 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copied ? "done" : "content_copy"}
            </span>
            <span>{copied ? "Skopiowano dane do schowka!" : "Kopiuj dane do przelewu BLIK"}</span>
          </button>
        </div>

        {/* Podsumowanie zlecenia */}
        <div className="text-xs space-y-1.5 p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/20">
          <div className="flex justify-between text-on-surface-variant">
            <span>Cmentarz:</span>
            <span className="font-medium text-primary text-right truncate max-w-[220px]">{order.cemeteryName}</span>
          </div>
          <div className="flex justify-between text-on-surface-variant">
            <span>Pakiet:</span>
            <span className="font-medium text-primary">{order.packageName}</span>
          </div>
          <div className="flex justify-between text-on-surface-variant">
            <span>Termin realizacji:</span>
            <span className="font-bold text-primary">{order.slotDate} ({order.slotTime})</span>
          </div>
        </div>

        <p className="text-[11px] text-center text-on-surface-variant">
          Potwierdzenie wraz z podsumowaniem i linkiem do śledzenia wysłaliśmy na podany numer telefonu.
          Po umyciu grobu otrzymasz link z raportem fotograficznym PRZED i PO.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-bold text-xs transition-colors"
        >
          Zamknij i wróć do strony głównej
        </button>
      </div>
    </div>
  );
}
