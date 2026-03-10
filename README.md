# TALCAT

Backoffice inicial per administrar TALCAT online i la bateria externa de validacio.

La direccio del projecte ara es `CAT-first`.

La web actual encara suporta formes fixes de pilot i fallback, pero l'objectiu final es administrar un unnic TALCAT adaptatiu amb una sola escala compartida.

## Què Inclou Ara

* UI d'admin amb dashboard, proves, participants, sessions, resultats i deploy
* `Prisma` amb esquema per proves, formes, intents, respostes i auditoria
* runner public per a administracions fixes provisionals
* preparacio per `Railway + PostgreSQL`
* workflow de `GitHub Actions` per lint i build

## Com S'Ha D'Interpretar

Els actius `V1` i `V2` no s'han d'entendre com el producte final.

Ara mateix serveixen per:

* QA de la plataforma;
* pilots inicials;
* administracio de fallback;
* blocs d'ancoratge mentre es construeix el motor adaptatiu.

## Stack

* `Next.js 16`
* `TypeScript`
* `Tailwind CSS 4`
* `Prisma ORM`
* `PostgreSQL`

## Arrencada Local

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
npm run catalog:sync
```

`npm run catalog:sync` prioritza el paquet de pilot adaptatiu (`pilot_catalog.json` i `pilot_form_catalog.json`) i, si no existeix, fa fallback a `short_form_v1_items.csv` i `short_form_v2_items.csv`.

## Deploy A Railway

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

## Estructura Principal

* `src/app` rutes i pantalles
* `src/components` components UI
* `src/lib` dades mock, formatadors i acces Prisma
* `prisma/schema.prisma` model de dades
* `prisma/seed.ts` dades inicials
* `docs/architecture.md` decisions d'arquitectura

## Seguents Passos Recomanats

* afegir autenticacio d'admins
* mantenir el runner fix com a fallback i QA
* afegir API i model de dades per al motor adaptatiu
* registrar `theta`, `SEM`, longitud i trajectoria adaptativa
* connectar la bateria externa de validacio dins del mateix flux
