# ats-resume-checker
A browser-based ATS resume keyword matcher. Free, private, no backend.
# ATS Resume Checker

A browser-based tool that compares a resume against a job description and reports keyword alignment. Everything runs client-side — no file ever leaves your device.

**Live demo:** _(add Vercel URL after deploy)_

## Why I built this

Job seekers get rejected by automated systems without knowing why. Commercial tools like Jobscan exist, but they are paid and upload your resume to their servers. This project explores whether a useful subset of that functionality can run entirely in the browser, for free, with better privacy.

## What it does

- Parses PDF and DOCX files in the browser using `pdf.js` and `mammoth.js`
- Extracts keywords from a job description after removing stop words
- Reports matched and missing keywords and a coverage percentage

## What it does NOT do

- It does not replicate any real ATS. There is no universal "ATS score" — every system (Workday, Taleo, Greenhouse, Lever) behaves differently.
- It uses exact keyword matching, so it misses synonyms (e.g. "JS" vs "JavaScript").
- It does not analyze formatting, fonts, or layout — only text content.

Being explicit about these limits is part of the point. A tool that pretends to be an oracle is worse than one that tells you exactly what it measures.

## Architecture decisions

**Browser-only processing.** Resume files contain personal data. Uploading them to a server creates compliance and privacy problems that a student project has no business creating. Keeping everything client-side eliminates that entire class of risk, and as a bonus, hosting is free.

**Plain HTML/CSS/JS.** No framework, no build step. The hard part of this project is the parsing and scoring logic, not the UI. Shipping something deployable in an afternoon beats perfecting a toolchain.

**Stop-word filtering over ML.** A full NLP pipeline would be overkill for the MVP. A curated stop-word list handles the 80% case and is easy to reason about.

## What I would do differently

- Add a synonym/alias map so "JS" and "JavaScript" match
- Detect common ATS-breaking formatting (tables, columns, headers/footers) from the parsed PDF structure
- Let users paste multiple job descriptions and rank them by match score

## Running locally

Open `index.html` in a browser. No build step required.

## Deploying

Hosted on Vercel as a static site. Every push to `main` triggers a redeploy.

## License

MIT
