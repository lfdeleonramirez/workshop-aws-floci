# Respuestas Correctas del Workshop

Este documento detalla las decisiones que otorgan la puntuación máxima en cada misión.

---

## Misión 1 — IAM: Tu identidad en la nube (máx. 150 pts + bonus)

### Pasos
1. **Crear un usuario IAM** — cualquier nombre válido (ej. `mi-usuario`)
2. **Asignar una política de permisos**

### Escenario
> El usuario es un desarrollador que solo necesita **leer archivos de S3** para su aplicación. No debería poder crear ni eliminar recursos.

### Opciones de política

| Política | Puntuación | Veredicto |
|----------|-----------|-----------|
| `AmazonS3ReadOnlyAccess` | **150 pts** | ✅ Correcta (least privilege) |
| `AmazonEC2FullAccess` | 50 pts | ❌ Permisos excesivos |
| `PowerUserAccess` | 50 pts | ❌ Permisos excesivos |
| `AdministratorAccess` | 50 pts | ❌ Permisos excesivos |

### Respuesta correcta
**`AmazonS3ReadOnlyAccess`** — Principio de least privilege: solo los permisos mínimos necesarios.

---

## Misión 2 — S3: Tu primer almacén (máx. 150 pts + bonus)

### Pasos
1. **Crear un bucket S3** — nombre válido (ej. `mi-primer-bucket-2026`)
2. **Subir un archivo**
3. **Decidir sobre versionado**

### Escenario
> El bucket guardará **reportes internos de tu empresa**. Solo tu equipo debería poder verlos.

### Decisiones y puntuación

| Decisión | Puntos |
|----------|--------|
| Bucket creado | 100 pts base |
| Acceso: **Privado** | +25 pts ✅ |
| Acceso: Público | +0 pts ❌ (genera issue en misión 5) |
| Versionado: **Habilitado** | +25 pts ✅ |
| Versionado: Deshabilitado | +0 pts |

### Respuestas correctas
- **Acceso: Privado** — Son reportes internos, no deben ser públicos.
- **Versionado: Habilitado** — Protege contra sobreescrituras accidentales.

---

## Misión 3 — EC2: Lanza tu servidor (máx. 150 pts + bonus)

### Pasos
1. **Crear Security Group**
2. **Abrir puertos**
3. **Lanzar instancia**

### Escenario
> El servidor va a correr una **página web** y necesitas conectarte por **SSH** para administrarlo. No necesita ningún otro servicio expuesto.

### Opciones de puertos

| Puerto | Para qué sirve |
|--------|----------------|
| SSH (22) | Acceso remoto al servidor |
| HTTP (80) | Tráfico web sin encriptar |
| HTTPS (443) | Tráfico web encriptado |
| Todos (0-65535) | Abre todo — peligroso |

### Puntuación

| Configuración de puertos | Puntos |
|--------------------------|--------|
| Solo puertos necesarios (22, 80, 443 o combinación) | **150 pts** ✅ |
| Todos los puertos abiertos (0-65535) | 50 pts ❌ (genera issue en misión 5) |

### Respuesta correcta
**Abrir solo SSH (22) y HTTP (80)** o SSH + HTTP + HTTPS. Nunca "Todos los puertos".

### Tipo de instancia
Cualquier opción es válida (no afecta puntuación), pero `t2.micro` es la opción recomendada (free tier).

---

## Misión 4 — Lambda: Código sin servidor (máx. 150 pts + bonus)

### Pasos
1. **Configurar función** (nombre, runtime, rol)
2. **Crear la función**
3. **Invocar la función**

### Escenario
> Tu función solo necesita **escribir logs** para monitoreo. No accede a otros servicios.

### Opciones de rol

| Rol | Descripción | Veredicto |
|-----|-------------|-----------|
| `LambdaBasicExecutionRole` | Solo escribir logs en CloudWatch | ✅ Correcto |
| `LambdaFullAccessRole` | Acceso total a Lambda, S3, DynamoDB, CloudWatch | ❌ Excesivo (genera issue en misión 5) |
| `AdminRole` | Acceso total a todos los servicios | ❌ Excesivo (genera issue en misión 5) |

### Puntuación

| Resultado | Puntos |
|-----------|--------|
| Función creada + invocación exitosa | **150 pts** ✅ |
| Función creada pero invocación falla | 100 pts |

### Respuestas correctas
- **Rol: `LambdaBasicExecutionRole`** — Solo necesita escribir logs.
- **Runtime:** Cualquiera es válido (Node.js 18/20, Python 3.12, Java 17).

---

## Misión 5 — Incidente de seguridad: Auditoría (máx. variable)

Esta misión evalúa las decisiones anteriores. Se detectan problemas según lo que hiciste en misiones 1-4.

### Issues posibles (según decisiones previas)

| Issue | Se genera cuando... |
|-------|---------------------|
| Usuario IAM con permisos excesivos | Misión 1: elegiste `AdministratorAccess`, `PowerUserAccess` o `EC2FullAccess` |
| Bucket S3 público | Misión 2: elegiste acceso Público |
| Security Group abierto | Misión 3: abriste todos los puertos (0-65535) |
| Lambda con rol excesivo | Misión 4: elegiste `AdminRole` o `LambdaFullAccessRole` |

### Preguntas de remediación y respuestas correctas

#### 1. Usuario IAM con permisos excesivos
> ¿Cómo remedias un usuario con permisos excesivos?

| Opción | Correcta |
|--------|----------|
| **Quitar la política actual y asignar solo los permisos mínimos necesarios** | ✅ (+40 pts) |
| Crear un segundo usuario con los mismos permisos como backup | ❌ (-20 pts) |

#### 2. Bucket S3 público
> ¿Cómo proteges un bucket que no debería ser público?

| Opción | Correcta |
|--------|----------|
| Cambiar el nombre del bucket para que nadie lo encuentre | ❌ (-20 pts) |
| **Aplicar una política de bucket que deniegue acceso público** | ✅ (+40 pts) |

#### 3. Security Group abierto
> ¿Cómo arreglas un Security Group con todos los puertos abiertos?

| Opción | Correcta |
|--------|----------|
| **Revocar la regla abierta y crear reglas solo para los puertos que necesitas (SSH, HTTP)** | ✅ (+40 pts) |
| Crear un segundo Security Group y dejar ambos activos | ❌ (-20 pts) |

#### 4. Lambda con rol excesivo
> ¿Cómo corriges una función Lambda con permisos excesivos?

| Opción | Correcta |
|--------|----------|
| Desactivar la función temporalmente hasta revisar los permisos después | ❌ (-20 pts) |
| **Cambiar el rol a uno con solo los permisos mínimos que la función necesita** | ✅ (+40 pts) |

### Mejor escenario posible
Si tomaste todas las decisiones correctas en misiones 1-4, esta misión muestra: **"¡Excelente! No se encontraron problemas"** y pasas directamente.

---

## Misión 6 — Limpieza (máx. 150 pts + bonus)

### Pasos
1. **Listar recursos activos**
2. **Eliminar cada recurso** (EC2, S3, Lambda)

### Puntuación

| Recursos restantes | Puntos |
|--------------------|--------|
| 0 (limpieza perfecta) | **150 pts** ✅ |
| 1 recurso | 100 pts |
| 2+ recursos | 50 pts |

### Respuesta correcta
**Eliminar todos los recursos.** En AWS real, lo que no se apaga, se cobra.

---

## Resumen de puntuación máxima

| Misión | Máximo base | Bonus tiempo |
|--------|-------------|--------------|
| 1 — IAM | 150 | hasta +50 |
| 2 — S3 | 150 | hasta +50 |
| 3 — EC2 | 150 | hasta +50 |
| 4 — Lambda | 150 | hasta +50 |
| 5 — Auditoría | 0 (sin issues) o 160 (4 issues × 40) | hasta +50 |
| 6 — Limpieza | 150 | hasta +50 |

**Puntuación ideal (decisiones perfectas):** 750 pts base + hasta 300 pts en bonus de tiempo = **1,050 pts máximo teórico**

### Badges

| Badge | Condición |
|-------|-----------|
| 🛡️ Security Master | No generó ningún issue de seguridad (misiones 1-4 perfectas) |
| 📚 Quick Learner | Generó issues pero los remedio todos correctamente |
| ⭐ Perfect Run | Completó todas las misiones sin reintentos |
| 🧹 Clean Freak | Completó la misión 6 |
| ⚡ Speed Demon | Top 3 en tiempo total (se calcula al final) |
