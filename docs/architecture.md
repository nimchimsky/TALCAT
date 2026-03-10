# Arquitectura de la webapp

## Objectiu

La webapp administra tot el cicle de les proves online:

* cataleg de proves i versions
* invitacions i cohorts
* sessions en curs
* resultats, alertes i traça operativa
* desplegament a Railway amb PostgreSQL

## Stack proposat

* `Next.js 16` amb App Router
* `TypeScript`
* `Prisma ORM`
* `PostgreSQL` a Railway
* `GitHub Actions` per lint i build

## Mòduls funcionals

### 1. Admin shell

Interfície per equips interns:

* dashboard operatiu
* pantalla de proves
* pantalla de participants
* monitor de sessions
* vista de resultats
* checklist de deploy

### 2. Model de dades

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

### 3. Persistència

`Prisma` encapsula el model i deixa el projecte preparat per:

* migracions
* seeds inicials
* connexió directa amb Railway Postgres

### 4. Operació i desplegament

Flux previst:

1. GitHub com a repositori font
2. Railway connectat al repo
3. servei web per Next.js
4. servei PostgreSQL gestionat per Railway
5. variables d'entorn injectades a Railway

## Evolució recomanada

### Fase 1

* connectar autenticació d'admins
* crear CRUD real de proves i formularis
* importar bancs d'items des de `7 Test 2026/data/forms`

### Fase 2

* public test runner per a participants
* assignació amb enllaços segurs
* scoring automàtic i exportacions

### Fase 3

* dashboards analítics connectats al pipeline psicomètric
* alertes de qualitat
* versionat de formes i equivalències
