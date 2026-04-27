const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const counterFile = path.join(__dirname, 'counter.json');
const logFile = path.join(__dirname, 'error.log');
const screenshotsDir = path.join(__dirname, 'screenshots');

// Upewnij się, że katalog na zrzuty ekranu istnieje
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

let browserInstance = null;
let browserInitPromise = null;
let lastUpdate = new Date();

// STAŁA KWOTA DO DODANIA
const STALA_KWOTA = 58609596;

// Funkcja do logowania błędów i informacji
function logToFile(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}\n`;
    
    try {
        fs.appendFileSync(logFile, logMessage, 'utf-8');
    } catch(e) {}
    
    console.log(logMessage.trim());
}

app.use(express.static(path.join(__dirname)));

function parseAmount(amountText) {
    if (!amountText) {
        logToFile('parseAmount: otrzymano pusty tekst', 'WARNING');
        return 0;
    }
    try {
        const cleaned = amountText.replace(/[^\d,\s]/g, '').replace(/\s/g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        if (isNaN(num)) {
            logToFile(`parseAmount: nie udało się sparsować "${amountText}"`, 'WARNING');
            return 0;
        }
        return num;
    } catch (error) {
        logToFile(`parseAmount: błąd parsowania "${amountText}" - ${error.message}`, 'ERROR');
        return 0;
    }
}

function formatAmount(amount) {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatAmountShort(amount) {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function saveCounterToFile(zrzutkaAmount, siepomagaAmount, totalAmount) {
    const data = {
        amount: formatAmount(totalAmount),
        amountShort: formatAmountShort(totalAmount),
        raw: totalAmount,
        zrzutka: zrzutkaAmount,
        siepomaga: siepomagaAmount,
        stalaKwota: STALA_KWOTA,
        timestamp: new Date().toISOString()
    };
    fs.writeFileSync(counterFile, JSON.stringify(data, null, 2), 'utf-8');
    logToFile(`Zapisano dane do counter.json: suma=${formatAmount(totalAmount)}`, 'INFO');
}

async function initBrowser() {
    if (browserInstance) {
        return browserInstance;
    }
    
    if (browserInitPromise) {
        logToFile('Oczekiwanie na trwającą inicjalizację przeglądarki...', 'INFO');
        return browserInitPromise;
    }
    
    browserInitPromise = (async () => {
        try {
            logToFile('Rozpoczynam inicjalizację przeglądarki Puppeteer...', 'INFO');
            browserInstance = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process'
                ]
            });
            logToFile('Przeglądarka Puppeteer zainicjalizowana pomyślnie', 'SUCCESS');
            return browserInstance;
        } catch (error) {
            logToFile(`Błąd inicjalizacji przeglądarki: ${error.message}`, 'ERROR');
            throw error;
        } finally {
            browserInitPromise = null;
        }
    })();
    
    return browserInitPromise;
}

// Funkcja pomocnicza do robienia zrzutów ekranu
async function takeScreenshot(page, name) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${name}_${timestamp}.png`;
        const filepath = path.join(screenshotsDir, filename);
        await page.screenshot({ path: filepath, fullPage: false });
        logToFile(`Zapisano zrzut ekranu: ${filename}`, 'INFO');
        return filepath;
    } catch (error) {
        logToFile(`Nie udało się zapisać zrzutu ekranu: ${error.message}`, 'ERROR');
        return null;
    }
}

async function fetchZrzutkaAmount() {
    const browser = await initBrowser();
    const page = await browser.newPage();
    
    try {
        await page.setExtraHTTPHeaders({
            'accept-language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
        });
        
        logToFile('Rozpoczynam pobieranie danych z zrzutka.pl...', 'INFO');
        await page.goto('https://zrzutka.pl/latwogang', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        logToFile('Strona zrzutka.pl załadowana, oczekiwanie 5s...', 'INFO');
        await page.waitForTimeout(5000);
        
        // Zapisujemy zrzut ekranu
        await takeScreenshot(page, 'zrzutka');
        
        // Próba odczytu dataLayer z dodatkowym logowaniem
        const evaluationResult = await page.evaluate(() => {
            const result = {
                value: null,
                dataLayerLength: 0,
                dataLayerSample: null,
                foundEntry: null
            };
            
            if (window.dataLayer) {
                result.dataLayerLength = window.dataLayer.length;
                // Pobierz próbkę pierwszych 5 wpisów (bez zagnieżdżonych obiektów, aby uniknąć ogromnych logów)
                try {
                    result.dataLayerSample = window.dataLayer.slice(0, 5).map(item => {
                        try {
                            return JSON.parse(JSON.stringify(item));
                        } catch (e) {
                            return String(item);
                        }
                    });
                } catch (e) {
                    result.dataLayerSample = 'Nie można skopiować próbki';
                }
                
                for (let item of window.dataLayer) {
                    if (item.fundraise && item.fundraise.value) {
                        result.value = item.fundraise.value;
                        result.foundEntry = {
                            fundraise: item.fundraise
                        };
                        break;
                    }
                }
            }
            return result;
        });
        
        logToFile(`dataLayer zrzutka.pl - liczba wpisów: ${evaluationResult.dataLayerLength}`, 'INFO');
        if (evaluationResult.dataLayerSample) {
            logToFile(`dataLayer zrzutka.pl próbka: ${JSON.stringify(evaluationResult.dataLayerSample).substring(0, 500)}`, 'DEBUG');
        }
        
        const kwota = evaluationResult.value;
        const amount = kwota || 0;
        
        if (kwota === null) {
            logToFile('Nie znaleziono kwoty w dataLayer na zrzutka.pl', 'WARNING');
            // Zróbmy dodatkowy zrzut z informacją w logach
            const pageContent = await page.content();
            logToFile(`Kod źródłowy strony (pierwsze 1000 znaków): ${pageContent.substring(0, 1000)}`, 'DEBUG');
        } else if (kwota === 0) {
            logToFile('Kwota z zrzutka.pl wynosi 0', 'WARNING');
        } else {
            logToFile(`Pomyślnie pobrano z zrzutka.pl: ${formatAmount(amount)}`, 'SUCCESS');
        }
        
        if (evaluationResult.foundEntry) {
            logToFile(`Szczegóły znalezionego wpisu: ${JSON.stringify(evaluationResult.foundEntry)}`, 'DEBUG');
        }
        
        return amount;
        
    } catch (error) {
        logToFile(`Błąd pobierania zrzutka.pl: ${error.message}`, 'ERROR');
        logToFile(`Stack trace: ${error.stack}`, 'ERROR');
        // Próbujemy zrobić zrzut nawet w przypadku błędu
        await takeScreenshot(page, 'zrzutka_error').catch(() => {});
        return 0;
    } finally {
        await page.close();
        logToFile('Zamknięto stronę zrzutka.pl', 'INFO');
    }
}

async function fetchSiepomagaAmount() {
    const browser = await initBrowser();
    const page = await browser.newPage();
    
    try {
        await page.setExtraHTTPHeaders({
            'accept-language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
        });
        
        logToFile('Rozpoczynam pobieranie danych z siepomaga.pl...', 'INFO');
        await page.goto('https://www.siepomaga.pl/latwogang', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        logToFile('Strona siepomaga.pl załadowana, oczekiwanie 5s...', 'INFO');
        await page.waitForTimeout(5000);
        
        await takeScreenshot(page, 'siepomaga');
        
        const pageTitle = await page.title();
        logToFile(`Tytuł strony siepomaga.pl: "${pageTitle}"`, 'INFO');
        
        // Główny selektor
        let amountText = await page.evaluate(() => {
            const element = document.querySelector('[data-testid="count-up-amount-fundraise-donation-section-fundraise-page"]');
            return element ? element.textContent.trim() : null;
        });
        
        let usedSelector = '[data-testid="count-up-amount-fundraise-donation-section-fundraise-page"]';
        
        if (!amountText) {
            logToFile('Nie znaleziono elementu z kwotą na siepomaga.pl – szukam alternatywnych selektorów', 'WARNING');
            
            // Próba alternatywnych selektorów
            const alternative = await page.evaluate(() => {
                const possibleSelectors = [
                    '[data-testid="count-up-amount"]',
                    '.amount-value',
                    '.fundraise-amount',
                    '.donation-amount',
                    '[class*="amount"]' // bardzo ogólny
                ];
                for (const selector of possibleSelectors) {
                    const el = document.querySelector(selector);
                    if (el && el.textContent.trim().length > 0) {
                        return { selector, value: el.textContent.trim() };
                    }
                }
                return null;
            });
            
            if (alternative) {
                amountText = alternative.value;
                usedSelector = alternative.selector;
                logToFile(`Znaleziono alternatywny selektor "${usedSelector}" z wartością: "${amountText}"`, 'INFO');
            } else {
                logToFile('Nie znaleziono żadnego selektora z kwotą na siepomaga.pl', 'ERROR');
                // Zrzut kodu źródłowego do analizy
                const pageContent = await page.content();
                logToFile(`Kod HTML (pierwsze 1500 znaków): ${pageContent.substring(0, 1500)}`, 'DEBUG');
                return 0;
            }
        } else {
            logToFile(`Główny selektor siepomaga.pl zwrócił: "${amountText}"`, 'INFO');
        }
        
        const parsed = parseAmount(amountText);
        if (parsed === 0) {
            logToFile(`Nie udało się sparsować kwoty z siepomaga.pl: "${amountText}"`, 'WARNING');
        } else {
            logToFile(`Pomyślnie pobrano z siepomaga.pl: ${formatAmount(parsed)}`, 'SUCCESS');
        }
        
        return parsed;
        
    } catch (error) {
        logToFile(`Błąd pobierania siepomaga.pl: ${error.message}`, 'ERROR');
        logToFile(`Stack trace: ${error.stack}`, 'ERROR');
        await takeScreenshot(page, 'siepomaga_error').catch(() => {});
        return 0;
    } finally {
        await page.close();
        logToFile('Zamknięto stronę siepomaga.pl', 'INFO');
    }
}

async function fetchDonationCounter() {
    const startTime = Date.now();
    logToFile('=== Rozpoczęcie aktualizacji licznika ===', 'INFO');
    
    try {
        await initBrowser();
        
        logToFile('Uruchamiam równoległe pobieranie danych z obu stron...', 'INFO');
        const [zrzutkaAmount, siepomagaAmount] = await Promise.all([
            fetchZrzutkaAmount(),
            fetchSiepomagaAmount()
        ]);
        
        const totalAmount = zrzutkaAmount + siepomagaAmount + STALA_KWOTA;
        const duration = Date.now() - startTime;
        
        console.log('\n=== WYNIKI ===');
        console.log(`zrzutka.pl:    ${formatAmount(zrzutkaAmount)}`);
        console.log(`siepomaga.pl:  ${formatAmount(siepomagaAmount)}`);
        console.log(`stała kwota:   ${formatAmount(STALA_KWOTA)}`);
        console.log(`─────────────────────────────`);
        console.log(`SUMA CAŁKOWITA: ${formatAmount(totalAmount)}`);
        console.log(`(słownie: ${formatAmountShort(totalAmount)})\n`);
        
        logToFile(`WYNIKI - zrzutka: ${formatAmount(zrzutkaAmount)}, siepomaga: ${formatAmount(siepomagaAmount)}, stała: ${formatAmount(STALA_KWOTA)}, RAZEM: ${formatAmount(totalAmount)}, czas: ${duration}ms`, 'INFO');
        
        if (zrzutkaAmount === 0) {
            logToFile('UWAGA: Kwota z zrzutka.pl wynosi 0 – możliwy problem z pobieraniem danych', 'WARNING');
        }
        if (siepomagaAmount === 0) {
            logToFile('UWAGA: Kwota z siepomaga.pl wynosi 0 – możliwy problem z pobieraniem danych', 'WARNING');
        }
        
        saveCounterToFile(zrzutkaAmount, siepomagaAmount, totalAmount);
        lastUpdate = new Date();
        
        logToFile('=== Aktualizacja licznika zakończona pomyślnie ===', 'SUCCESS');
        
    } catch (error) {
        logToFile(`Błąd w fetchDonationCounter: ${error.message}`, 'ERROR');
        logToFile(`Stack trace: ${error.stack}`, 'ERROR');
    }
}

async function startCounterUpdater() {
    console.log(`Start: ${new Date().toLocaleString('pl-PL')}`);
    console.log(`Stała kwota dodawana do sumy: ${formatAmount(STALA_KWOTA)}\n`);
    logToFile(`Serwer uruchomiony, stała kwota: ${formatAmount(STALA_KWOTA)}`, 'INFO');
    
    await initBrowser();
    
    // Pierwsza aktualizacja natychmiast
    await fetchDonationCounter();
    
    // Potem co 80 sekund
    setInterval(async () => {
        console.log(`⏰ [${new Date().toLocaleTimeString('pl-PL')}] Aktualizacja...`);
        logToFile(`Planowa aktualizacja o ${new Date().toLocaleTimeString('pl-PL')}`, 'INFO');
        await fetchDonationCounter();
    }, 200000);
    
    console.log('✓ Aktualizator licznika uruchomiony (co 80 sekund)');
    logToFile('Aktualizator licznika uruchomiony (interwał: 80s)', 'INFO');
}

app.listen(PORT, async () => {
    console.log(`
╔════════════════════════════════════════════════╗
║     Licznik wpłat Łatwogang x Cancer Fighters   ║
║        http://localhost:${PORT}                      ║
╚════════════════════════════════════════════════╝
    `);
    
    if (!fs.existsSync(counterFile)) {
        fs.writeFileSync(counterFile, JSON.stringify({
            amount: 'Ładowanie...',
            timestamp: new Date().toISOString()
        }));
        console.log('✓ Plik counter.json utworzony');
        logToFile('Utworzono nowy plik counter.json', 'INFO');
    }
    
    await startCounterUpdater();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n→ Zamykanie aplikacji...');
    logToFile('Otrzymano sygnał SIGINT - zamykanie aplikacji', 'INFO');
    if (browserInstance) {
        await browserInstance.close();
        logToFile('Przeglądarka zamknięta', 'INFO');
    }
    logToFile('Aplikacja zamknięta', 'INFO');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n→ Zamykanie aplikacji...');
    logToFile('Otrzymano sygnał SIGTERM - zamykanie aplikacji', 'INFO');
    if (browserInstance) {
        await browserInstance.close();
        logToFile('Przeglądarka zamknięta', 'INFO');
    }
    logToFile('Aplikacja zamknięta', 'INFO');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    logToFile(`NIEZŁAPANY WYJĄTEK: ${error.message}`, 'ERROR');
    logToFile(`Stack: ${error.stack}`, 'ERROR');
});

process.on('unhandledRejection', (reason, promise) => {
    logToFile(`NIEOBSŁUŻONE ODRZUCENIE: ${reason}`, 'ERROR');
});