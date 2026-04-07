# Fakturownik

Aplikacja do wystawiania faktur VAT dla małych firm i freelancerów. Działa lokalnie – nie wymaga serwera ani bazy danych w chmurze.

## Funkcje

- **Wystawianie faktur** – tworzenie, edycja i podgląd faktur VAT z konfigurowalnym szablonem numeracji (np. `{nr}/{m}/{rrrr}`)
- **Spójna numeracja** – system pilnuje ciągłości numerów faktur, wykrywa luki i konflikty
- **Szybkie duplikowanie** – wystaw nową fakturę na podstawie poprzedniej jednym kliknięciem
- **Kontrahenci** – baza klientów z możliwością wyszukiwania po NIP (GUS / Biała Lista / VIES)
- **KSeF** – wysyłanie faktur do Krajowego Systemu e-Faktur
- **Eksport PDF** – generowanie pliku PDF z podglądem faktury
- **Szablony wyglądu** – dostępne różne style wizualizacji faktur
- **Kod QR** – automatycznie generowany kod QR z danymi faktury lub linkiem do weryfikacji KSeF
- **Dane lokalne** – wszystkie dane przechowywane lokalnie w plikach JSON, brak rejestracji i zewnętrznych usług

## Technologie

- [SvelteKit](https://kit.svelte.dev/) – framework frontendowy
- Node.js – lokalny backend (API)

## Uruchomienie

```sh
npm install
npm run dev
```

Aplikacja dostępna pod adresem `http://localhost:5173`.

## Budowanie

```sh
npm run build
npm run preview
```
