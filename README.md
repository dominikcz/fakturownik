# Fakturownik

Aplikacja do wystawiania faktur VAT dla małych firm i freelancerów. Działa lokalnie - nie wymaga serwera ani bazy danych w chmurze.

## Funkcje

- **Wystawianie faktur** - tworzenie, edycja i podgląd faktur VAT z konfigurowalnym szablonem numeracji (np. `{nr}/{m}/{rrrr}`)
- **Spójna numeracja** - system pilnuje ciągłości numerów faktur, wykrywa luki i konflikty
- **Szybkie duplikowanie** - wystaw nową fakturę na podstawie poprzedniej jednym kliknięciem
- **Kontrahenci** - baza klientów z możliwością wyszukiwania po NIP (GUS / Biała Lista / VIES)
- **KSeF** - wysyłanie faktur do Krajowego Systemu e-Faktur
- **Eksport PDF** - generowanie pliku PDF z podglądem faktury (wymaga instalacji Playwright)
- **Szablony wyglądu** - dostępne różne style wizualizacji faktur
- **Kod QR** - automatycznie generowany kod QR z danymi faktury lub linkiem do weryfikacji KSeF
- **Dane lokalne** - wszystkie dane przechowywane lokalnie w plikach JSON, brak rejestracji i zewnętrznych usług

## Technologie

- [SvelteKit](https://kit.svelte.dev/) - framework frontendowy
- Node.js - lokalny backend (API)
- Playwright - opcjonalnie, jeśli potrzebujesz eksportu do PDF. Bez niego można także uzyskać PDFy, po prostu drukując fakturę do PDF, ale z nim jest po prostu wygodniej.

## Instalacja

Zalecam pobrać repozytorium z linii poleceń za pomocą git. Jeśli nie masz Git to ściągnij z https://git-scm.com/.

Pobranie za pomocą git:
```sh
git clone https://github.com/dominikcz/fakturownik.git
cd fakturownik
npm install
```

Opcjonalnie można też pobrać spakowaną wersję z https://github.com/dominikcz/fakturownik/archive/refs/heads/main.zip. Trochę trudniej się ją jednak wtedy aktualizuje i trzeba zabezpieczyć dane.

### Opcjonalny Playwright

Playwright jest używany do generowania wersji PDF faktur. Jeśli potrzebujesz tej funkcjonalności to dodatkowo zainstaluj playwright za pomocą polecenia:
```
npx playwright install
```

Można się jednak bez niego obyć korzystając z opcji wydruku faktury i wybierając opcję wydruku do PDF.

## Uruchomienie

```sh
npm run dev
```
Aplikacja będzie dostępna pod adresem `http://localhost:5173`.

## Aktualizacja

Jeśli masz aplikację pobraną za pomocą Git, to wystarczy, że w folderze aplikacji napiszesz:

```
git pull
npm install
npm run dev
```

Jeśli pobierasz aplikację jako archiwum zip, to najlepiej:
- rozpakuj go w innym folderze
- skopiuj folder `data` ze starego do nowego folderu
- sprawdź, czy wszystko jest ok, po uruchomieniu
- teraz możesz bezpiecznie usunąć stary folder 

Możesz też (bardziej ryzykowne, bo możesz niechcący usunąć za dużo):
- usunąć zawartość dotychczasowego folderu, zostawiając jedynie folder `data`
- rozpakować zip w dotychczasowym folderze
