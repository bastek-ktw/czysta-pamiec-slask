"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface BeforeAfterSliderProps {
  beforeImage?: string;
  afterImage?: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function BeforeAfterSlider({
  beforeImage = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
  afterImage = "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=800&q=80",
  beforeLabel = "Przed umyciem",
  afterLabel = "Po czyszczeniu i impregnacji"
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(100, (x / width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, handleMouseMove, handleTouchMove, handleEnd]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-surface-container shadow-md border border-outline-variant/40 select-none">
      <div
        ref={containerRef}
        className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden cursor-ew-resize"
        onMouseDown={(e) => {
          setIsDragging(true);
          handleMove(e.clientX);
        }}
        onTouchStart={(e) => {
          setIsDragging(true);
          handleMove(e.touches[0].clientX);
        }}
      >
        {/* Zdjęcie PO (Tło) */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${afterImage})` }}
        >
          <span className="absolute bottom-3 right-3 bg-primary/80 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
            ✨ {afterLabel}
          </span>
        </div>

        {/* Zdjęcie PRZED (Przycinane warstwą) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <div
            className="absolute inset-0 aspect-[16/10] sm:aspect-[16/9] w-full bg-cover bg-center filter grayscale-[30%] contrast-[95%]"
            style={{
              backgroundImage: `url(${beforeImage})`,
              width: containerRef.current ? `${containerRef.current.clientWidth}px` : "100%",
            }}
          >
            <span className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
              🍂 {beforeLabel}
            </span>
          </div>
        </div>

        {/* Linia podziału i uchwyt */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)] cursor-ew-resize"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-primary text-white border-2 border-white shadow-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
          </div>
        </div>
      </div>

      <div className="p-2.5 bg-surface-container-low text-center text-xs text-on-surface-variant flex items-center justify-center gap-1.5 font-medium">
        <span className="material-symbols-outlined text-[16px] text-secondary">touch_app</span>
        <span>Przeciągnij suwak w lewo lub w prawo, aby zobaczyć efekt mycia</span>
      </div>
    </div>
  );
}
