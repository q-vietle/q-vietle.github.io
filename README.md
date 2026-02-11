# Academic Personal Website Template (GitHub Pages)

This repository is configured as a static academic personal website for a PhD student or professor, based on **Jekyll + Minimal Mistakes** and ready for deployment to:

- `https://<username>.github.io`

## Why this template

This setup uses **Minimal Mistakes (Option C)** for three practical reasons:

1. Stable deployment on GitHub Pages with minimal configuration.
2. Flexible page structure for publications, teaching, projects, and blog notes.
3. Built-in support for responsive layout, SEO tags, and common academic profile links.

## Included pages and data

- Home: `index.md`
- Publications: `_pages/publications.md` + `_data/publications.yml`
- Teaching: `_pages/teaching.md` + `_data/teaching.yml`
- Projects: `_pages/projects.md` + `_data/projects.yml`
- Blog/Notes: `_pages/blog.md` + `_posts/2026-02-10-welcome-to-my-academic-notes.md`
- Contact: `_pages/contact.md`

## Placeholder values to replace

Update these placeholders in `_config.yml`, `index.md`, and `_pages/contact.md`:

- `<FULL_NAME>`
- `<TITLE>`
- `<UNIVERSITY / DEPARTMENT>`
- `<EMAIL>`
- `<URL>`
- `<LIST_ITEM_1> ... <LIST_ITEM_4>`

Also place your CV PDF at:

- `/files/cv.pdf`

## GitHub Pages deployment (step-by-step)

1. Create a GitHub repository named exactly:
   - `<username>.github.io`
2. Push this code to the `main` branch.
3. In GitHub, open:
   - `Settings` → `Pages`
4. Under **Build and deployment**, choose:
   - **Source**: `GitHub Actions`
5. Confirm workflow runs successfully in:
   - `Actions` → `Deploy Jekyll site to Pages`
6. Open your site at:
   - `https://<username>.github.io`

## Local preview (optional)

```bash
bundle install
bundle exec jekyll serve
```

Then open `http://127.0.0.1:4000`.

## Notes

- `og:image` is configured to `/img/avatar-placeholder.svg` in `_config.yml`.
- `jekyll-sitemap` and `jekyll-seo-tag` are enabled via plugins.
- Automatic dark-mode styles are included in `assets/css/_academic.scss` using `prefers-color-scheme`.
