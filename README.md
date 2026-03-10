# TALCAT

Backoffice inicial per administrar proves online de vocabulari i bateries relacionades.

Inclou:

* UI d'admin amb dashboard, proves, participants, sessions, resultats i deploy
* `Prisma` amb esquema per proves, formes, intents, respostes i auditoria
* preparacio per `Railway + PostgreSQL`
* workflow de `GitHub Actions` per lint i build

## Stack

* `Next.js 16`
* `TypeScript`
* `Tailwind CSS 4`
* `Prisma ORM`
* `PostgreSQL`

## Arrencada local

1. Instal.la dependencies:

```bash
npm install
```

2. Copia `.env.example` a `.env` i ajusta `DATABASE_URL`.

3. Genera client Prisma i crea esquema:

```bash
npm run db:push
```

4. Carrega dades inicials:

```bash
npm run db:seed
```

5. Arrenca l'app:

```bash
npm run dev
```

Si no hi ha `DATABASE_URL`, la UI continua funcionant en mode mock per facilitar el disseny inicial.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run db:generate
npm run db:push
npm run db:migrate
npm run db:seed
```

## Deploy a Railway

1. Crea un repositori a GitHub i puja aquesta carpeta.
2. A Railway, crea un projecte nou i connecta el repo.
3. Afegeix un servei `PostgreSQL`.
4. Configura aquestes variables:

```bash
DATABASE_URL=...
NEXT_PUBLIC_APP_URL=https://el-teu-domini.up.railway.app
APP_NAME=TALCAT
```

5. Executa una primera inicialitzacio de base de dades:

```bash
npm run db:push
npm run db:seed
```

6. Railway ja podra servir la web amb `npm run start`.

## GitHub

Ja hi ha workflow a `.github/workflows/ci.yml` que valida:

* instal.lacio
* `prisma generate`
* `eslint`
* `next build`

## Estructura principal

* `src/app` rutes i pantalles
* `src/components` components UI
* `src/lib` dades mock, formatadors i acces Prisma
* `prisma/schema.prisma` model de dades
* `prisma/seed.ts` dades inicials
* `docs/architecture.md` decisions d'arquitectura

## Seguents passos recomanats

* afegir autenticacio d'admins
* crear CRUD real per proves i formes
* construir el runner public per als participants
* connectar importacio dels bancs d'items des de `7 Test 2026/data/forms`
