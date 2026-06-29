# Retire

Retirement planning calculator built with React and Vite.

## Live Site

https://retire-ii9p5ja4u-sigfigs789s-projects.vercel.app/

## Scripts

```sh
npm run dev
```

Runs the local Vite dev server.

```sh
npm run build
```

Builds the production site into `dist/`.

```sh
npm run preview
```

Serves the production build locally.

```sh
npm test
```

Runs the Vitest test suite.

## Deploy To Vercel

Import this GitHub repo into Vercel and use the default Vite settings:

- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

The included `vercel.json` rewrites all routes to `index.html` so React Router pages like `/advanced` work when loaded directly.
