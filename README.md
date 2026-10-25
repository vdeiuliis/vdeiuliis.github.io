# vdeiuliis.github.io

Sito accademico di Vittorio De Iuliis, basato sul template [Academic Pages](https://github.com/academicpages/academicpages.github.io) (Jekyll) e pubblicato con GitHub Pages su **https://vdeiuliis.github.io**.

## Dove si modifica cosa

| Cosa | File |
|------|------|
| Nome, bio nella barra laterale, link (Scholar, ResearchGate, GitHub, ORCID, email) | `_config.yml` (sezione `author`) |
| Voci del menu in alto | `_data/navigation.yml` |
| Home / About | `_pages/about.md` |
| Teaching | `_pages/teaching.md` |
| Activities (editorial, reviewing, progetti) | `_pages/activities.md` |
| Thoughts (riflessioni) | `_thoughts/` (un file per post) |
| Personal page | `_pages/personal.md` (foto in `images/personal/`) |
| Colori, font, stile delle card | `_sass/_custom-modern.scss` (es. cambia `--c-accent` per il colore principale) |
| News (un file per notizia) | `_posts/*.md` |
| Pubblicazioni (un file per lavoro) | `_publications/*.md` |
| Foto profilo | `images/profile.jpg` (sostituiscila con la tua foto, stesso nome, oppure cambia `avatar` in `_config.yml`) |
| CV (PDF) | `files/CV_Vittorio_De_Iuliis.pdf` (sostituisci il file con lo stesso nome per aggiornarlo) |
| PDF e altri file scaricabili | cartella `files/` → visibili su `https://vdeiuliis.github.io/files/nome.pdf` |

### Aggiungere una pubblicazione
Copia un file esistente in `_publications/`, rinominalo `AAAA-MM-GG-titolo-breve.md` e aggiorna i campi:

```yaml
---
title: 'Titolo del lavoro'
collection: publications
category: journals        # preprints | journals | chapters | conferences | workshops | national | theses
permalink: /publication/AAAA-MM-GG-titolo-breve
date: AAAA-MM-GG          # determina l'ordine (più recente in alto)
year: AAAA
authors: 'A. Rossi, V. De Iuliis'
venue: 'IEEE Transactions on Automatic Control'
details: 'vol. 1, no. 1, pp. 1–10'   # facoltativo
note: 'Accepted'                      # facoltativo (badge)
paperurl: 'https://doi.org/...'       # facoltativo
citation: 'A. Rossi, V. De Iuliis, &quot;Titolo&quot;, <i>Rivista</i>, AAAA.'
---
```

### Aggiungere una news
Crea un file in `_posts/` chiamato `AAAA-MM-GG-titolo-breve.md` (la data è quella mostrata nel badge). Basta il titolo:

```yaml
---
title: "Paper accepted at **IEEE CDC 2026**, Honolulu."
link: "https://doi.org/..."   # facoltativo: aggiunge "Link →"
---
```

Il badge mostra giorno, mese e anno; se il giorno non è noto aggiungi `month_only: true` per mostrare solo mese e anno.
Se sotto le righe `---` scrivi anche un testo, la news avrà una sua pagina e comparirà "Read more →".
Le ultime 5 news appaiono in homepage; tutte sono nella pagina **News**.

### Aggiungere un post in "Thoughts"
Creare un file in `_thoughts/` chiamato `AAAA-MM-GG-titolo-breve.md`:

```
---
title: "Titolo del post"
date: 2026-10-25
---

Testo in Markdown, paragrafi separati da una riga vuota.
```

La pagina Thoughts mostra i post dal più recente, con l'inizio del primo paragrafo come anteprima.

Anteprima per i social: la card 1200×630 con il titolo viene generata automaticamente da GitHub a ogni push (`.github/scripts/make_cards.py`), senza fare nulla. Per usare un'immagine diversa: metterla in `images/` e aggiungere nel front matter `og_image: "thoughts/nome.png"` (percorso relativo a `images/`). Una card già presente in `images/thoughts/` con lo stesso nome del post non viene rigenerata: per rifarla (es. dopo aver cambiato il titolo) basta cancellarla.

### Statistiche visite (GoatCounter)
Le visite sono registrate con [GoatCounter](https://www.goatcounter.com) (senza cookie). Il codice del sito è in `_config.yml` (`goatcounter: "vdeiuliis"`); la dashboard privata è su https://vdeiuliis.goatcounter.com. Per non contare le proprie visite, aprire una volta `https://vdeiuliis.github.io/#toggle-goatcounter` in ogni browser che si usa.

## Pubblicazione su GitHub (prima volta)

1. Su GitHub crea un repository **pubblico** chiamato esattamente `vdeiuliis.github.io` (senza README).
2. Da Terminale, in questa cartella:
   ```bash
   git init -b main
   git add .
   git commit -m "Initial academic website"
   git remote add origin https://github.com/vdeiuliis/vdeiuliis.github.io.git
   git push -u origin main
   ```
   (In alternativa usa GitHub Desktop: *Add existing repository* → *Publish*.)
3. Nel repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Dopo 1–2 minuti (tab *Actions*), il sito è online su https://vdeiuliis.github.io.

Ogni successivo `git push` aggiorna automaticamente il sito.

## Anteprima in locale (facoltativa)

```bash
brew install ruby        # se serve
gem install bundler
bundle install
bundle exec jekyll serve -l --force_polling
```
Poi apri http://localhost:4000.
