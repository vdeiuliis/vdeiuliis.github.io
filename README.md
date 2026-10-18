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
| Personal page | `_pages/personal.md` |
| Pubblicazioni (un file per lavoro) | `_publications/*.md` |
| Foto profilo | `images/profile.jpg` (sostituiscila con la tua foto, stesso nome, oppure cambia `avatar` in `_config.yml`) |
| PDF e altri file scaricabili | cartella `files/` → visibili su `https://vdeiuliis.github.io/files/nome.pdf` |

### Aggiungere una pubblicazione
Copia un file esistente in `_publications/`, rinominalo `AAAA-MM-GG-titolo-breve.md` e aggiorna i campi:

```yaml
---
title: 'Titolo del lavoro'
collection: publications
category: journals        # journals | chapters | conferences | workshops | national | theses
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
bundle exec jekyll serve -l -H localhost
```
Poi apri http://localhost:4000.
