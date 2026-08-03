# Floci AWS Workshop

Workshop interactivo y gamificado para aprender los servicios fundamentales de AWS: **IAM, S3, EC2 y Lambda**. Los participantes completan misiones prácticas que crean recursos reales en un emulador local (Floci/LocalStack), toman decisiones de seguridad y compiten en un scoreboard en tiempo real.

Todo corre en local con Docker. No se necesita cuenta de AWS.

---

## Requisitos

- Docker y Docker Compose
- ~2 GB de RAM libre para los contenedores

---

## Comandos

```bash
bash scripts/dev.sh iniciar    # Construye y levanta todo
bash scripts/dev.sh apagar     # Apaga los contenedores
bash scripts/dev.sh logs       # Ver logs en tiempo real
bash scripts/dev.sh reiniciar  # Borra datos y reconstruye desde cero
bash scripts/dev.sh borrar     # Elimina TODO: contenedores, imágenes, volúmenes
```

---

## URLs (una vez levantado)

| Recurso | URL |
|---------|-----|
| Workshop (estudiantes) | http://127.0.0.1 |
| Floci UI (consola AWS visual) | http://127.0.0.1:4500 |
| Admin (scoreboard completo) | http://127.0.0.1/admin?code=ADMIN-XXXXXX |

Los códigos de acceso y admin se muestran en la terminal al levantar.

---

## Arquitectura

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│    Floci     │     │  Floci UI    │
│  React/Vite  │     │   Express    │     │  (LocalStack)│◀────│ Consola AWS  │
│  Nginx :80   │     │  :3000 int   │     │  :4566       │     │  :4500       │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                            │
                     ┌──────┴──────┐
                     │   SQLite    │
                     │  (usuarios, │
                     │   scores)   │
                     └─────────────┘
```

### Contenedores Docker

| Servicio | Imagen | Puerto | Función |
|----------|--------|--------|---------|
| frontend | Build local (React + Nginx) | 80 | Interfaz del workshop |
| backend | Build local (Node.js/Express) | 3000 (interno) | API REST + WebSocket |
| floci | `floci/floci:latest` | 4566 | Emulador de servicios AWS |
| floci-ui | `floci/floci-ui:latest` | 4500 | Consola visual estilo AWS Console |

---

## Flujo del participante

1. Entra a `http://127.0.0.1` e ingresa el **código de acceso** + nickname + nombre
2. Ve el **dashboard** con 6 misiones secuenciales (debe completar cada una para desbloquear la siguiente)
3. Cada misión tiene 3 fases:
   - **Aprende** — Teoría: explicación del servicio, conceptos clave, analogía
   - **Practica** — Pasos interactivos: toma decisiones y ejecuta acciones contra Floci
   - **Resultado** — Puntuación basada en sus decisiones + bonus por tiempo
4. Al completar cada paso, ve el **comando AWS CLI** equivalente que se ejecutó
5. El **scoreboard** se actualiza en tiempo real vía WebSocket

---

## Las 6 misiones

| # | Servicio | Tema | Decisión clave |
|---|----------|------|----------------|
| 1 | IAM | Crear usuario + asignar política | ¿Le das AdministratorAccess o solo lo mínimo necesario? |
| 2 | S3 | Crear bucket + subir archivo + versionado | ¿Público o privado? ¿Versionado sí o no? |
| 3 | EC2 | Security Group + puertos + lanzar instancia | ¿Abres todos los puertos o solo SSH+HTTP? |
| 4 | Lambda | Crear función + elegir rol + invocar | ¿AdminRole o LambdaBasicExecutionRole? |
| 5 | Auditoría | Escanear infraestructura + remediar | Identifica y corrige los problemas de seguridad que creaste |
| 6 | Cleanup | Listar y eliminar todos los recursos | En la nube, lo que no se apaga se cobra |

---

## Configuración de misiones

### Fuente de verdad: `backend/src/missions-config.json`

Este archivo JSON contiene TODA la configuración del workshop:
- Títulos, descripciones, conceptos e íconos de cada misión
- Los pasos de cada misión con sus opciones (políticas, puertos, roles, etc.)
- Escenarios y hints que se muestran al estudiante
- Respuestas correctas
- Puntuación por decisión
- Issues de seguridad de la misión 5 con sus preguntas de remediación
- Configuración de badges y bonus por tiempo

**Para modificar el workshop solo se edita este archivo.** No hay que tocar código.

### Respuestas documentadas: `exercices/respuestas-correctas.md`

Documento legible con todas las respuestas correctas, puntuación por decisión y el scoring completo. Útil como referencia para el facilitador.

---

## Cómo funciona la validación

Cuando un participante completa una misión y da click en "Verificar misión":

1. El backend llama al **Validator** (`backend/src/services/validator.js`)
2. El Validator se conecta a **Floci** y consulta el estado real de los recursos:
   - Misión 1: `ListUsers` + `ListAttachedUserPolicies` → verifica qué política asignó
   - Misión 2: `ListBuckets` + `GetBucketVersioning` → verifica si el bucket es privado y tiene versionado
   - Misión 3: `DescribeInstances` + `DescribeSecurityGroups` → verifica si los puertos están abiertos a todo
   - Misión 4: `ListFunctions` + `Invoke` → verifica que la función existe y responde
   - Misión 5: Valida conteo de respuestas correctas/incorrectas de remediación
   - Misión 6: Verifica que no queden recursos activos
3. Los valores de scoring vienen de `missions-config.json`
4. Si Floci aún no reporta el recurso, el backend **reintenta hasta 3 veces** con 1.5s de espera
5. Se calcula **bonus por tiempo** (top 25% → +50 pts, top 50% → +25 pts)
6. Se asignan **badges** si corresponde

---

## Qué pasa por detrás cuando el estudiante ejecuta una acción

Cuando el participante presiona un botón (ej. "Crear usuario", "Lanzar instancia"):

1. Frontend llama a `POST /api/missions/:id/execute` con la acción y parámetros
2. El backend usa el **Executor** (`backend/src/services/executor.js`)
3. El Executor llama al **SDK de AWS** apuntando a Floci (`http://floci:4566`)
4. Floci procesa la llamada y crea el recurso real en su emulador
5. El Executor retorna el **comando AWS CLI** equivalente (lo que harías en AWS real)
6. El frontend muestra ese comando inline en una terminal estilizada

Ejemplo: si el participante crea un bucket "mi-bucket", ve:
```
$ aws s3api create-bucket --bucket mi-bucket
✓ Bucket "mi-bucket" creado
```

---

## Ver recursos desde la UI de Floci

La Floci UI (`http://127.0.0.1:4500`) muestra los recursos que se van creando:

| Sección | Qué muestra |
|---------|-------------|
| Storage | Buckets S3, objetos dentro de cada bucket |
| Compute | Instancias EC2, AMIs |
| Networking | VPCs, Security Groups, reglas de ingress |
| Serverless | Funciones Lambda |
| Secrets Manager | Secretos almacenados |

**Nota:** IAM no está implementado aún en la UI de Floci (aparece como placeholder). Los usuarios IAM solo se ven a través de los comandos CLI del workshop.

---

## Sistema de puntuación

### Base (por decisiones correctas)

| Misión | Máximo base |
|--------|-------------|
| 1 — IAM (least privilege) | 150 pts |
| 2 — S3 (privado + versionado) | 150 pts |
| 3 — EC2 (puertos restringidos) | 150 pts |
| 4 — Lambda (rol mínimo + invocación OK) | 150 pts |
| 5 — Auditoría (40 pts por respuesta correcta) | variable |
| 6 — Cleanup (eliminar todo) | 150 pts |

### Bonus por tiempo

| Posición | Bonus |
|----------|-------|
| Top 25% más rápido | +50 pts |
| Top 50% | +25 pts |
| Resto | +0 pts |

### Badges

| Badge | Condición |
|-------|-----------|
| Security Master | No generó ningún issue de seguridad en misiones 1-4 |
| Quick Learner | Generó issues pero los remedió todos correctamente |
| Perfect Run | Completó todas las misiones sin reintentos |
| Clean Freak | Completó la misión 6 |
| Speed Demon | Top 3 en tiempo total (se calcula al final) |

---

## Tests (QA)

```bash
bash test-api.sh
```

Ejecuta 90 tests automáticos que cubren:
- Health check
- Login (código correcto e incorrecto)
- Inicio de sesión (asignación de entorno Floci)
- Lista de misiones
- Endpoint de config público (verifica que NO expone respuestas)
- Flujo completo de las 6 misiones (ejecutar + validar)
- Scoreboard
- Edge cases (sin token, acciones inválidas, misiones repetidas)
- Endpoints de admin

---

## Estructura del proyecto

```
├── backend/
│   ├── src/
│   │   ├── missions-config.json    ← FUENTE DE VERDAD (preguntas, respuestas, scoring)
│   │   ├── index.js                ← Servidor Express + Socket.IO
│   │   ├── db/database.js          ← Schema SQLite (usuarios, intentos, scores, badges)
│   │   ├── middleware/auth.js      ← JWT auth middleware
│   │   ├── routes/
│   │   │   ├── auth.js             ← Login con código de acceso
│   │   │   ├── missions.js         ← CRUD misiones + config + execute + validate
│   │   │   ├── scoreboard.js       ← Ranking en vivo
│   │   │   └── sessions.js         ← Asignación de entorno Floci
│   │   ├── services/
│   │   │   ├── missions-loader.js  ← Lee el JSON y expone funciones (público vs privado)
│   │   │   ├── executor.js         ← Ejecuta acciones contra Floci (AWS SDK)
│   │   │   ├── validator.js        ← Valida recursos en Floci + calcula score
│   │   │   ├── scoring.js          ← Time bonus + badges
│   │   │   ├── lambda-code.js      ← Código ZIP para funciones Lambda
│   │   │   └── docker.js           ← Gestión de contenedores Floci
│   │   └── socket/handlers.js      ← WebSocket para scoreboard en vivo
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 ← Rutas: Login, Dashboard, Mission, Scoreboard, Admin
│   │   ├── pages/                  ← Páginas principales
│   │   ├── components/
│   │   │   ├── practices/          ← Componentes interactivos de cada misión (leen config del API)
│   │   │   ├── LearnSection.jsx    ← Sección teórica
│   │   │   ├── PracticeSection.jsx ← Wrapper de práctica + botón verificar
│   │   │   ├── CommandInline.jsx   ← Muestra comando AWS CLI inline
│   │   │   ├── ScoreReveal.jsx     ← Animación de puntuación
│   │   │   └── StepCard.jsx        ← Card de cada paso
│   │   ├── data/missions.js        ← Contenido educativo (teoría, conceptos, analogías)
│   │   ├── context/AuthContext.jsx  ← Estado de autenticación
│   │   └── lib/api.js              ← Cliente HTTP para la API
│   ├── Dockerfile
│   └── package.json
├── exercices/                       ← Documentación de ejercicios + respuestas
├── docker-compose.dev.yml           ← Compose para entorno local
├── scripts/dev.sh                   ← Script de gestión (iniciar/apagar/reiniciar/borrar)
└── test-api.sh                      ← Suite de tests QA (90 tests)
```

---

## Seguridad del endpoint de config

El endpoint `GET /api/missions/:id/config` sirve la configuración pública al frontend pero **nunca expone**:
- Respuestas correctas (`correctOption`, `correctRole`, `correctPorts`)
- Valores de scoring
- Reglas de validación

Los participantes no pueden hacer trampa inspeccionando la red.

---

## Panel de administrador

Accede a `http://127.0.0.1/admin?code=ADMIN-XXXXXX` para:
- Ver el scoreboard completo con nombres, scores y badges
- Revelar el podio final a todos los participantes (botón "Revelar podio")
- El código admin se muestra al levantar los contenedores

---

## Modificar el workshop

### Cambiar preguntas u opciones
Editar `backend/src/missions-config.json` — cambiar textos, agregar opciones, modificar escenarios.

### Cambiar puntuación
Modificar los objetos `scoring` de cada misión en el mismo JSON.

### Agregar un issue de seguridad nuevo
Agregar al array `issues` de la misión 5 con su `remediation.question` y `options`.

### Cambiar contenido educativo (teoría)
Editar `frontend/src/data/missions.js` — explicaciones, conceptos clave y analogías.

Después de cualquier cambio: `bash scripts/dev.sh reiniciar`
