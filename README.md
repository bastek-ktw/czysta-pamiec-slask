# Czysta Pamięć — Górny Śląsk 🪦🕯️

Produkcyjna platforma e-commerce / booking do zamawiania profesjonalnego mycia grobów, sprzątania nagrobków oraz dostawy świeżych kwiatów i zniczy (w tym lokalnej edycji limitowanej: **szklany znicz serce Ruchu Chorzów "PAMIĘTAMY"**) przed 1 Listopada na terenie Górnego Śląska (**Chorzów, Katowice, Siemianowice Śląskie, Bytom, Świętochłowice, Ruda Śląska**).

Zaprojektowana w duchu **Sanctuary Rest (Reverent Tactile Minimalism)** ze Stitcha, zoptymalizowana pod urządzenia mobilne, odporna na obciążenie w szczycie Wszystkich Świętych.

---

## 🚀 Kluczowe Funkcjonalności

1. **Lokalizator Grobów (Zero Tarcia):**
   - Wbudowana baza 22 cmentarzy komunalnych i parafialnych dla 6 śląskich miast z koordynatami GPS i nawigacją.
   - **3 tryby wskazania grobu:**
     - *Tryb A (Po nazwisku zmarłego):* automatyczny deep-link dla wykonawcy do wyszukiwarek Grobonet (`chorzow.grobonet.com`, `siemianowice.grobonet.com/wyszukiwarka`, `przelajka.grobonet.com`, `grobonet.com`).
     - *Tryb B (Zdjęcie/Mapa):* kompresja w locie w telefonie przez HTML5 Canvas do WebP (<100 KB) i zapis jako DataURL bezpośrednio w bazie (zero problemów ze storage w Vercel Serverless).
     - *Tryb C (Kwatera/Sektor/Rząd/Grób):* precyzyjny formularz segmentowy.
2. **Pancerny Rezerwator Slotów (Twardy Limit Max 2 / Godzinę):**
   - Okna godzinowe (08:00 – 18:00) od 25 października do 1 listopada.
   - Atomowa transakcja SQL uniemożliwiająca overbooking (race-condition safe).
   - Etykiety dostępności: `0/2 Wolne`, `1/2 Ostatnie wolne miejsce!`, `2/2 Wyprzedane`.
3. **Błyskawiczne Płatności (Działające od 1. minuty):**
   - **Express BLIK na telefon:** natychmiastowa rezerwacja terminu na 15 minut z podaniem numeru telefonu do przelewu BLIK, kwoty oraz kodu zamówienia (np. `CP-101`) w tytule. Zero formalności KYC.
   - Opcjonalna bramka Stripe (Apple Pay, Google Pay).
4. **Dynamiczny Silnik Cennika i Rabatów:**
   - Typy i wielkości nagrobka (pojedynczy, podwójny, urnowy, grobowiec, mogiła ziemna).
   - 3 Pakiety: Podstawowy, Kompleksowy (Śląska Troska), Złoty Znicz VIP.
   - Kwiaty (chryzantemy doniczkowe żółte/białe, wrzosy trio, wiązanki żywe z jodły nobilis).
   - Znicze (szklane klasyczne, solarne LED, kapliczki XXL oraz **edycja specjalna: serce Ruchu Chorzów "PAMIĘTAMY"**).
   - Automatyczny rabat wielogrobowy `-20%` na drugi nagrobek na tym samym cmentarzu oraz kody rabatowe (np. `SLASK10`).
5. **Panel Dyspozytora (`/admin`):**
   - Chroniony kodem PIN (domyślnie: `1920`).
   - Szybkie dodawanie pojemności (`+1 slot` dla wybranej godziny, gdy dochodzi nowa ekipa) i blokada godzin.
   - Zmiana cen pakietów, numeru telefonu BLIK i banera na żywo.
   - Wysyłka zlecenia na WhatsApp wykonawcy jednym kliknięciem.
6. **Karta Zadania Wykonawcy w Terenie (`/zlecenie/[token]`):**
   - Nawigacja GPS Google Maps + Grobonet + checklista usług.
   - Aparat w telefonie: wgrywanie zdjęć **PRZED** i **PO UMYCIU** z natychmiastowym podglądem.
7. **Raport Fotograficzny dla Klienta (`/raport/[token]`):**
   - Interaktywny slider porównawczy PRZED / PO.

---

## 🛠️ Architektura i Stos Technologiczny

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript.
- **Styling:** Tailwind CSS z paletą Sanctuary Rest (`#0F291E`, `#D97706`, `#059669`, `#F8FAFC`, fonty `Newsreader` i `Plus Jakarta Sans`).
- **Baza danych:** `@libsql/client` (SQLite / Turso) z modułem `ensureDbInitialized()` – baza sama tworzy tabele i seeduje cennik przy pierwszym zapytaniu.
- **Walidacja:** `Zod`.

---

## ⚡ 2-Click Deploy (Instrukcja wdrożenia)

### Wariant A: Lokalnie w 1 minutę
```bash
git clone https://github.com/bastek-ktw/czysta-pamiec-slask.git
cd czysta-pamiec-slask
npm install
npm run build
npm run start
```
Aplikacja dostępna pod adresem: `http://localhost:3000`.

### Wariant B: Deploy na Vercel (Produkcja)
1. Zaimportuj repozytorium `bastek-ktw/czysta-pamiec-slask` w panelu [vercel.com](https://vercel.com).
2. Dodaj opcjonalne zmienne środowiskowe (lub pozostaw domyślne):
   - `DATABASE_URL` (np. darmowa baza z [turso.tech](https://turso.tech) dla współdzielonej bazy w chmurze lub pozostaw puste dla domyślnej bazy lokalnej).
   - `ADMIN_PIN` (domyślnie `1920`).
3. Kliknij **Deploy**. Sklep działa od razu ze wszystkimi cmentarzami i cennikiem!

---

## 📱 Dostęp do Paneli

- **Sklep / Rezerwacje:** `/`
- **Panel Dyspozytora:** `/admin` (PIN: `1920`)
- **API Health Check:** `/api/health`

---

*Czysta Pamięć — Górny Śląsk © 2026*
