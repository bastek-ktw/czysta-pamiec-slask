"use client";

import Link from "next/link";

interface HeaderProps {
  bannerText?: string;
  stepTitle?: string;
}

export function Header({
  bannerText = "Śpiesz się: Ostatnie wolne terminy przed 1 Listopada w Chorzowie, Katowicach i okolicach!",
  stepTitle = "Wyszukiwarka Grobu"
}: HeaderProps) {
  return (
    <>
      {/* Dynamiczny baner informacyjny */}
      <div className="bg-primary text-white text-xs py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse shrink-0"></span>
        <span className="truncate">{bannerText}</span>
      </div>

      <header className="sticky top-0 w-full z-40 bg-surface/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-outline-variant/30">
        <div className="max-w-4xl mx-auto h-20 px-4 flex items-center justify-between gap-2">
          {/* Logo i Tytuł */}
          <Link href="/" className="flex items-center gap-3 min-w-0 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[24px]">local_florist</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-serif-title text-xl font-bold text-primary tracking-tight truncate leading-tight group-hover:text-primary-container transition-colors">
                  Czysta Pamięć
                </span>
                <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant text-[11px] font-bold tracking-tight flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  1 Listopada
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant truncate">
                <span>Górny Śląsk</span>
                <span className="text-outline-variant text-[10px]">•</span>
                <span className="text-secondary font-semibold">{stepTitle}</span>
              </div>
            </div>
          </Link>

          {/* Akcje nagłówka */}
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href="tel:+48327201101"
              aria-label="Infolinia 24/7"
              className="h-10 px-3 flex items-center gap-1.5 rounded-lg bg-surface-container-low text-primary hover:bg-surface-container transition-colors text-xs font-semibold"
            >
              <span className="material-symbols-outlined text-[18px]">call</span>
              <span className="hidden sm:inline">32 720 11 01</span>
            </a>

            <Link
              href="/admin"
              aria-label="Panel Dyspozytora"
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-colors"
              title="Panel Dyspozytora"
            >
              <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
