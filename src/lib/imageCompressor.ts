/**
 * Kompresuje dowolny plik graficzny (JPEG/PNG/HEIC po odczytaniu) do kompaktowego formatu WebP DataURL
 * - Maksymalny wymiar: 1000px
 * - Jakość: 0.75 (z pętlą obniżania jakości do < 100KB)
 * - Wynik: czysty DataURL image/webp, bezpieczny do zapisu bezpośrednio w bazie SQLite / LibSQL
 */
export async function compressImageToWebP(file: File, maxDimension = 1000, targetMaxBytes = 100000): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Błąd podczas odczytu pliku ze zdjęciem"));

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Nieprawidłowy format zdjęcia"));

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Skalowanie proporcjonalne do maxDimension
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject(new Error("Brak wsparcia dla Canvas 2D"));
        }

        // Rysowanie z wygładzaniem
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Pierwsza próba kompresji do WebP
        let quality = 0.75;
        let dataUrl = canvas.toDataURL("image/webp", quality);

        // Jeśli przeglądarka nie wspiera eksportu do webp, fallback na jpeg
        if (!dataUrl.startsWith("data:image/webp")) {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        // Iteracyjne obniżanie jakości, jeśli rozmiar przekracza targetMaxBytes
        let attempts = 0;
        while (dataUrl.length > targetMaxBytes * 1.37 && quality > 0.25 && attempts < 5) {
          quality -= 0.12;
          dataUrl = canvas.toDataURL("image/webp", quality);
          attempts++;
        }

        resolve(dataUrl);
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
