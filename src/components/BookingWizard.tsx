"use client";

import { useState, useEffect } from "react";
import { ServiceItem, SystemSettings } from "@/lib/types";
import { Header } from "./Header";
import { Stepper } from "./Stepper";
import { Step1Locator, Step1Data } from "./Step1Locator";
import { Step2Packages, Step2Data } from "./Step2Packages";
import { Step3Checkout } from "./Step3Checkout";

interface BookingWizardProps {
  initialServices: ServiceItem[];
  settings: SystemSettings;
}

const LOCAL_STORAGE_KEY = "czysta_pamiec_booking_state_v1";

const defaultStep1: Step1Data = {
  city: "Chorzów",
  cemeteryId: "chorzow-cmentarna",
  cemeteryName: "Cmentarz Parafii św. Barbary (Stary)",
  grobonetUrl: "https://chorzow.grobonet.com",
  googleMapsUrl: "https://maps.google.com/?q=50.2974,18.9482",
  locationMode: "deceased",
  deceasedName: "",
  deathYear: "",
  sectorInfo: "",
  gravePhotoDataUrl: "",
  graveTypeId: "gt-single",
  graveTypeName: "Grób pojedynczy (standardowy)",
  graveTypePrice: 0
};

const defaultStep2: Step2Data = {
  packageId: "pkg-complex",
  packageName: "Pakiet Śląska Troska (Kompleksowy)",
  packagePrice: 189,
  addons: [],
  isSecondGrave: false,
  secondGraveDeceasedName: ""
};

export function BookingWizard({ initialServices, settings }: BookingWizardProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [step1Data, setStep1Data] = useState<Step1Data>(defaultStep1);
  const [step2Data, setStep2Data] = useState<Step2Data>(defaultStep2);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);

  // Wczytanie z localStorage po montowaniu na kliencie
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.step1) setStep1Data(parsed.step1);
        if (parsed.step2) setStep2Data(parsed.step2);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
      }
    } catch (e) {
      console.warn("Could not load booking state from localStorage:", e);
    } finally {
      setIsLoadedFromStorage(true);
    }
  }, []);

  // Zapis do localStorage przy każdej zmianie
  useEffect(() => {
    if (!isLoadedFromStorage) return;
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          currentStep,
          step1: step1Data,
          step2: step2Data
        })
      );
    } catch (e) {
      console.warn("Could not persist booking state:", e);
    }
  }, [currentStep, step1Data, step2Data, isLoadedFromStorage]);

  const handleReset = () => {
    setStep1Data(defaultStep1);
    setStep2Data(defaultStep2);
    setCurrentStep(1);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {}
  };

  // Filtrowanie kategorii usług
  const packages = initialServices.filter((s) => s.category === "package");
  const graveTypes = initialServices.filter((s) => s.category === "grave_type");
  const flowers = initialServices.filter((s) => s.category === "flower");
  const candles = initialServices.filter((s) => s.category === "candle");
  const extraAddons = initialServices.filter((s) => s.category === "addon");

  const getStepTitle = () => {
    if (currentStep === 1) return "Krok 1: Wyszukiwarka Grobu";
    if (currentStep === 2) return "Krok 2: Wybór Pakietu i Zniczy";
    return "Krok 3: Rezerwacja Terminu i Kasa";
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header bannerText={settings.bannerText} stepTitle={getStepTitle()} />

      <main className="flex-1 pb-16">
        <Stepper currentStep={currentStep} onStepClick={(s) => setCurrentStep(s)} />

        {currentStep === 1 && (
          <Step1Locator
            initialData={step1Data}
            graveTypes={graveTypes}
            onNext={(newData) => {
              setStep1Data(newData);
              setCurrentStep(2);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}

        {currentStep === 2 && (
          <Step2Packages
            initialData={step2Data}
            packages={packages}
            flowers={flowers}
            candles={candles}
            extraAddons={extraAddons}
            graveTypePriceDelta={step1Data.graveTypePrice}
            onBack={() => {
              setCurrentStep(1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onNext={(newData) => {
              setStep2Data(newData);
              setCurrentStep(3);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}

        {currentStep === 3 && (
          <Step3Checkout
            step1={step1Data}
            step2={step2Data}
            settings={settings}
            onBack={() => {
              setCurrentStep(2);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Stopka */}
      <footer className="bg-surface-container-low border-t border-outline-variant/30 py-6 px-4 text-center text-xs text-on-surface-variant">
        <div className="max-w-4xl mx-auto space-y-2">
          <p className="font-semibold text-primary">
            Czysta Pamięć — Profesjonalna opieka nad grobami na Górnym Śląsku
          </p>
          <p>
            Obsługujemy: Chorzów, Katowice, Siemianowice Śląskie, Bytom, Świętochłowice, Ruda Śląska.
          </p>
          <p className="opacity-70 text-[11px]">
            Infolinia 24/7: <a href="tel:+48327201101" className="underline font-bold">+48 32 720 11 01</a> • Bezpieczne płatności Express BLIK
          </p>
        </div>
      </footer>
    </div>
  );
}
