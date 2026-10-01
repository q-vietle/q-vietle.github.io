# Quoc Viet Le — Portfolio

Personal portfolio site, live at https://q-vietle.github.io

Plain static HTML + CSS (no build step, no theme dependency).

## Structure

```
index.html              # single-page portfolio (About, Research, Projects, Notes, Publications, Teaching, Contact)
assets/css/style.css    # site styles (light/dark mode)
assets/js/              # main.js (UI), aquarium.js (hero), submarine.js (cursor)
projects/index.html    # list of projects
projects/king-county/   # King County house price report (static HTML exported from the R analysis)
projects/hcmc-map/      # public HCMC real-estate price map (data built by src/export_public_map.py in the Real-estate-project repo)
notes/                  # reading notes with interactive figures
  index.html            #   list of notes
  computer-vision/*.html #   "Computer vision" section: 16 short notes (Deep Learning ch. 6 and 9, AlexNet, ResNet)
  sql/*.html            #   "SQL" section: 14 short notes, widgets in js/sql.js (runs SQLite via sql.js from cdnjs)
  notes.css             #   article + widget styles
  js/i18n.js, i18n-vi.js #   EN / VI switch: prose is written twice (data-l="en"/"vi"), figure labels come from the dictionary
  js/viz.js             #   shared canvas/colour helpers; js/ffn.js, js/conv.js, js/cases.js = widgets per note
.github/workflows/      # GitHub Pages deployment
```

To add a note, copy one of the pages in `notes/computer-vision/`, keep the header/footer and the prev/next links, and list it in `notes/index.html`.

## Editing content

Open `index.html` and search for `TODO` — each section has a comment marking what to replace
(bio, research interests, projects, publications, teaching, email). Duplicate an `<article class="card">`
block to add another project.

## Local preview

Open `index.html` in a browser, or run `python -m http.server 8000` and visit http://localhost:8000.

## Deployment

Pushing to `main` triggers `.github/workflows/pages.yml`.
In GitHub: **Settings → Pages → Source: GitHub Actions**.
