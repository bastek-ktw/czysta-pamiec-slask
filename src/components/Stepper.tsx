"use client";

interface StepperProps {
  currentStep: 1 | 2 | 3;
  onStepClick?: (step: 1 | 2 | 3) => void;
}

export function Stepper({ currentStep, onStepClick }: StepperProps) {
  const steps = [
    { num: 1, label: "Lokalizacja", sub: "Identyfikacja grobu" },
    { num: 2, label: "Pakiety", sub: "Usługi i znicze" },
    { num: 3, label: "Termin & Kasa", sub: "Blokada slotu" }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pt-4 pb-2">
      <div className="bg-surface-container-low rounded-xl p-4 shadow-sm border border-outline-variant/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
              {currentStep}
            </span>
            <span className="font-semibold text-primary text-sm">
              Krok {currentStep} z 3
            </span>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-semibold">
            {steps[currentStep - 1].label}
          </span>
        </div>

        {/* Pasek postępu */}
        <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden flex">
          <div
            className="bg-secondary h-full rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          ></div>
        </div>

        {/* Etykiety kroków */}
        <div className="grid grid-cols-3 mt-2 text-xs">
          {steps.map((s) => {
            const isCurrent = s.num === currentStep;
            const isCompleted = s.num < currentStep;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => onStepClick && isCompleted && onStepClick(s.num as any)}
                className={`text-left transition-colors ${
                  isCurrent
                    ? "text-primary font-bold"
                    : isCompleted
                    ? "text-on-surface-variant hover:text-primary cursor-pointer font-medium"
                    : "text-on-surface-variant/50 cursor-default"
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>{s.num}.</span>
                  <span className="truncate">{s.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
