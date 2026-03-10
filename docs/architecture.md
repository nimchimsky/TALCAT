# Arquitectura De La Webapp

## Objectiu

La webapp administra tot el cicle operatiu de TALCAT:

* cataleg de proves i modes de lliurament
* invitacions i cohorts
* sessions en curs
* resultats, alertes i traça operativa
* desplegament a Railway amb PostgreSQL

La direccio funcional ara es:

* un TALCAT adaptatiu com a producte principal
* formes fixes nomès com a fallback, pilot i QA

## Stack Proposat

* `Next.js 16` amb App Router
* `TypeScript`
* `Prisma ORM`
* `PostgreSQL` a Railway
* `GitHub Actions` per lint i build

## Moduls Funcionals

### 1. Admin Shell

Interficie per equips interns:

* dashboard operatiu
* pantalla de proves
* pantalla de participants
* monitor de sessions
* vista de resultats
* checklist de deploy

### 2. Model De Dades

Entitats clau:

* `Organization`
* `AdminUser`
* `Participant`
* `Test`
* `Form`
* `ItemBankEntry`
* `Assignment`
* `Session`
* `Attempt`
* `Response`
* `AuditLog`

El model actual ja permet administracions fixes.

La seguent evolucio ha d'afegir camps o entitats per:

* sessio adaptativa
* estimacio de `theta`
* `SEM` condicional
* trajectoria d'items administrats
* motiu d'aturada
* mode `adaptive` versus `fixed_fallback`

### 3. Persistencia

`Prisma` encapsula el model i deixa el projecte preparat per:

* migracions
* seeds inicials
* connexio directa amb Railway Postgres

### 4. Operacio I Desplegament

Flux previst:

1. GitHub com a repositori font
2. Railway connectat al repo
3. servei web per Next.js
4. servei PostgreSQL gestionat per Railway
5. variables d'entorn injectades a Railway

## Evolucio Recomanada

### Fase 1

* connectar autenticacio d'admins
* crear CRUD real de proves i formularis
* mantenir importacio del paquet de pilot adaptatiu i dels fallback fixos provisionals

### Fase 2

* afegir motor de sessio adaptativa
* guardar `theta`, `SEM`, longitud i motiu d'aturada
* conservar runner fix com a fallback

### Fase 3

* dashboards analitics connectats al pipeline psicometric
* alertes de qualitat
* monitoratge d'exposicio d'items
* integracio de la bateria externa i de la validacio prospectiva
