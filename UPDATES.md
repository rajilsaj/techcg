# Update log

Every change requested in a Claude Code session, newest first, with when it was made and whether it has been pushed to GitHub (`origin/main`, which Vercel deploys from).

**Pushed** values: `No` = only on this machine · `Committed` = committed locally, not yet pushed · `Yes (<commit>)` = on GitHub.

| Date & time (UTC-4) | Update | Pushed |
| --- | --- | --- |
| 2026-10-12 13:41 | Page addresses are in French: `/recents`, `/questions`, `/vitrine`, `/emplois`, `/commentaires`, `/connexion`, `/inscription`, `/recuperation`, `/publier`, `/publication/:id`, `/profil/:nom`, `/connexion/confirmation`, `/godmod/utilisateurs`, `/godmod/moderation`, `/godmod/parametres`. Old English addresses redirect permanently to the French ones. `/api/*` unchanged. | Yes (92b72e0) |
| 2026-10-12 13:40 | Completed updates are now committed and pushed to `main` automatically (rule saved in the local `CLAUDE.md`). Added this log, `UPDATES.md`. | Yes (this log's commit) |
| 2026-10-12 13:31 | Header shows the logged-in user: username and karma (links to the profile), **Publier** and **Déconnexion**; logged-out visitors see **Connexion**. Logout also signs out of Firebase. `getSession()` is cached per request. | Yes (1a15d61) |
| 2026-10-12 13:25 | Site is French-only: removed the English dictionary, country/browser language detection, the `locale` cookie and the FR/EN switcher; `<html lang="fr">`; `t()` is imported directly from `@/i18n`. | Yes (1a15d61) |
| 2026-10-12 13:15 | Diagnosed the site's 500 errors: the Supabase database had been paused. Resumed from the Supabase dashboard; no code change. | n/a |
