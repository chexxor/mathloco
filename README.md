# Minneapolis Math Book Club - Astro + Tailwind + Cloudflare Pages

## 🎯 Features

- ✅ [Tailwind](https://tailwindcss.com/);
- ✅ [Astro 4v](https://astro.build/);
- ✅ [Astro/Sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/);
- ✅ [Drizzle ORM](https://orm.drizzle.team/docs/migrations);

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `bun install`            | Installs dependencies                            |
| `bun dev`                | Starts local dev server at `localhost:3000`      |
| `bun start:app`          | Alternative way to start the dev server          |
| `bun start:functions`    | Starts Wrangler Pages dev server                 |
| `bun build`              | Build your production site to `./dist/`          |
| `bun preview`            | Preview your build locally with host flag        |
| `bun astro`             | Run Astro CLI commands                           |
| `bun db:generate`       | Generate Drizzle database artifacts              |
| `bun db:migrate:local`  | Apply DB migrations locally                      |
| `bun db:migrate:prod`   | Apply DB migrations to production                |
| `bun db:migrate:preview`| Apply DB migrations to preview environment       |
| `bun db:studio:local`   | Run Drizzle Studio locally                      |
| `bun db:studio:preview` | Run Drizzle Studio for preview environment      |
| `bun db:studio:prod`    | Run Drizzle Studio for production environment   |

## 🎨 Customization

Update variable colours at:

- `book-theme` in [tailwing.config.cjs](./tailwind.config.cjs);
- `$book-theme-color` in [Layout.astro](./src/layouts/Layout.astro);

## 🔍 SEO

- Rich Results Test: https://search.google.com/test/rich-results
- https://developers.facebook.com/tools/debug/

## ☕ Supporters

If you want to support this project, you can ☕ [**buy a coffee here**](https://buymeacoff.ee/candidosales)
