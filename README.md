# Licznik wpłat Łatwogang x Cancer Fighters 🎯

Aplikacja, która co 20 sekund pobiera aktualny stan licznika wpłat ze strony https://www.siepomaga.pl/latwogang i wyświetla go na Twojej stronie.

## Wymagania

- Node.js 14+ zainstalowany na komputerze
- npm (zwykle instaluje się razem z Node.js)
- Połączenie z Internetem

## Instalacja

1. Otwórz terminal w folderze projektu (LATWOO)

2. Zainstaluj zależności:
```bash
npm install
```

To zainstaluje Express (framework serwera) i Puppeteer (do załadowania JavaScript i pobrania strony).

## Uruchomienie

```bash
npm start
```

lub

```bash
node server.js
```

Serwer uruchomi się na: **http://localhost:3000**

Otwórz tę stronę w przeglądarce aby zobaczyć licznik wpłat.

## Jak to działa?

1. **Frontend** (`index.html`):
   - Wyświetla licznik wpłat w ładnym interfejsie
   - Co 20 sekund pobiera dane z backendu
   - Pokazuje status i czas ostatniej aktualizacji

2. **Backend** (`server.js`):
   - Korzysta z Puppeteer do otworzenia przeglądarki (headless)
   - Wchodzi na stronę siepomaga.pl/latwogang
   - Czeka na załadowanie wszystkich skryptów JavaScript
   - Ekstraktuje wartość licznika z elementu HTML
   - Zwraca dane w formacie JSON
   - Aktualizuje licznik co 20 sekund

## Struktura projektu

```
LATWOO/
├── index.html          # Strona główna (frontend)
├── server.js           # Backend server (Node.js + Puppeteer)
├── package.json        # Zależności projektu
└── README.md          # Ten plik
```

## Selektory HTML

Aplikacja szuka tego elementu na stronie siepomaga.pl:
```html
<span data-testid="count-up-amount-fundraise-donation-section-fundraise-page">
    kwota w złotych
</span>
```

## Zmienne środowiskowe

Możesz zmienić port na inny, ustawiając zmienną środowiskową:

```bash
PORT=8080 npm start
```

## Rozwiązywanie problemów

### "Moduł express/puppeteer nie znaleziony"
```bash
npm install
```

### Serwer się zamyka
- Sprawdź czy port 3000 nie jest zajęty
- Zmień port: `PORT=8080 npm start`

### Licznik pokazuje "Błąd połączenia"
- Sprawdź połączenie z Internetem
- Strona siepomaga.pl może być niedostępna
- Czekaj - aplikacja spróbuje ponownie za 2 sekundy

## Optymalizacje

Jeśli aplikacja zużywa za dużo CPU:
- Zwiększ interwał aktualizacji z 2000ms na wyższą wartość w `server.js` (linia 73)
- Zmień `2000` na np. `5000` (5 sekund) lub `10000` (10 sekund)

## Uwagi

- Aplikacja wymaga aktywnego połączenia z Internetem
- Puppeteer automatycznie pobiera Chromium (może być duży pobór danych)
- Pierwszy start może trwać dłużej ze względu na inicjalizację przeglądarki

## Autor

Stworzono dla Łatwogang x Cancer Fighters 💪

## Licencja

MIT
