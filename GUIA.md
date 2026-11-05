# Guía: arrancar WhatsApp API + bot de respuestas automáticas

Esta guía explica, paso a paso, cómo poner en marcha todo en tu PC para que el bot conteste solo los mensajes de WhatsApp.

---

## Cómo funciona (en 30 segundos)

Hay **dos programas** que deben estar corriendo **al mismo tiempo**, cada uno en su propia terminal:

| # | Programa | Qué hace | Cómo se arranca |
|---|----------|----------|-----------------|
| 1 | **API de WhatsApp** (open-wa) | Abre WhatsApp Web en Chrome y lo convierte en una API en `http://localhost:8080` | `./start.sh` |
| 2 | **Bot** (`bot.js`) | Escucha los mensajes que llegan a la API, le pide la respuesta al backend de la barbería y la envía | `node bot.js` |

```
Tu cliente escribe ──► WhatsApp ──► API (terminal 1) ──► Bot (terminal 2) ──► Backend barberia-api
                                         ▲                                             │
                                         └──────── saludo + horas disponibles ─────────┘
```

El texto de la respuesta lo arma el **backend** (`POST /whatsapp/reply` en `barberia-api`): un saludo con las horas libres de hoy y mañana, según el horario, los bloqueos y las citas agendadas.

Para agendar, el cliente responde con **su nombre, el día y la hora**, por ejemplo `Juan Pérez mañana 15:00` (también vale `3 pm` o `3 de la tarde`). El backend crea la cita automáticamente con precio $0 (el barbero lo ajusta en la app) y le confirma. Si la hora no está libre, le vuelve a mandar las horas disponibles. Por defecto el bot usa el backend de Render (`https://iabarber.onrender.com`).

> ⚠️ Si cierras cualquiera de las dos terminales, el bot deja de responder.

---

## Archivos de la carpeta

| Archivo | Para qué sirve |
|---------|----------------|
| `start.sh` | Arranca la API de WhatsApp (open-wa versión **5.10.0**) |
| `bot.js` | El bot: reenvía cada mensaje al backend y envía su respuesta |
| `session.data.json` | Tu sesión de WhatsApp guardada (evita escanear el QR cada vez). **No lo compartas: da acceso a tu WhatsApp.** |
| `.open-wa/` | Configuración interna de open-wa (ruta de Chrome) |
| `GUIA.md` | Esta guía |

---

## 0. Requisitos (solo verificar una vez)

Abre una terminal y comprueba:

```bash
node --version            # debe ser v18 o superior (tienes v24)
google-chrome --version   # debe estar instalado
```

Si alguno falla, instálalo antes de seguir.

---

## 1. Preparación (solo la primera vez)

### 1.1 Quitar el contenedor Docker antiguo

Antes se intentó usar Docker y quedó un contenedor ocupando el puerto 8080. Elimínalo:

```bash
sudo docker rm -f openwa
```

- Si dice `No such container`, perfecto: ya no existe.

### 1.2 Comprobar que el puerto 8080 está libre

```bash
sudo ss -ltnp 'sport = :8080'
```

- **No sale ninguna línea debajo del encabezado** → libre ✅
- **Sale una línea** → otro programa lo usa. Ver [Problemas: puerto ocupado](#el-puerto-8080-está-ocupado).

### 1.3 Dar permiso de ejecución al script

```bash
cd ~/Escritorio/claude-whastapp
chmod +x start.sh
```

---

## 2. Arrancar la API de WhatsApp (Terminal 1)

```bash
cd ~/Escritorio/claude-whastapp
./start.sh
```

La primera vez tarda un poco más (descarga open-wa). Espera a ver estas líneas:

```
Server running on http://localhost:8080
...
WhatsApp Client ready
```

✅ Cuando aparezca **`WhatsApp Client ready`**, la API está lista.
**Deja esta terminal abierta.**

### ¿Te pide escanear un QR?

Solo pasa si la sesión no existe o caducó.

1. Abre en el navegador: **http://localhost:8080/dashboard/**
2. En tu teléfono: **WhatsApp → ⋮ / Ajustes → Dispositivos vinculados → Vincular un dispositivo**
3. Escanea el QR de la pantalla.
4. Si el QR caduca, recarga la página: se genera uno nuevo.

### Comprobar que la API está conectada (opcional)

En otra terminal:

```bash
curl -s http://localhost:8080/health | grep -o '"state":"[A-Z]*"'
```

Debe responder `"state":"READY"`.

---

## 3. Arrancar el bot (Terminal 2)

Abre **una terminal nueva** (en VS Code: botón `+` del panel de terminal) y ejecuta:

```bash
cd ~/Escritorio/claude-whastapp
node bot.js
```

Debe aparecer:

```
✅ Bot escuchando mensajes en http://localhost:8080 (backend: https://iabarber.onrender.com)
```

**Deja esta terminal abierta también.**

> Si la API está en otro puerto (por ejemplo 8081), arranca el bot así:
> `API_URL=http://localhost:8081 node bot.js`
>
> Para usar el backend corriendo en tu PC (`npm run start:dev` en `barberia-api`) en vez del de Render:
> `BACKEND_URL=http://localhost:3000 node bot.js`

---

## 4. Probar que funciona

1. Desde **otro teléfono** (no el número vinculado), escribe **`hola`** al número vinculado.
   - Los mensajes que te envías a ti mismo se ignoran a propósito.
2. En la **terminal 2** deberías ver:
   ```
   📩 Juan: hola
   📤 -> 12345678@lid: ¡Hola Juan! 👋 Gracias por escribir a la barbería.
   ```
3. En el otro teléfono llega el saludo con las horas disponibles de hoy y mañana.
4. Responde con un nombre y una de esas horas, por ejemplo `Prueba mañana 15:00`. Debe llegar la confirmación y la cita aparece en la app. Cancélala después desde la app.

✅ Si ves `📩` y `📤` y llega la respuesta, **todo funciona**.

---

## 5. Uso diario (después de la primera vez)

Cada vez que quieras tener el bot activo:

| Terminal 1 | Terminal 2 |
|------------|------------|
| `cd ~/Escritorio/claude-whastapp` | `cd ~/Escritorio/claude-whastapp` |
| `./start.sh` | *(espera a ver `WhatsApp Client ready` en la terminal 1)* |
| | `node bot.js` |

### Detener todo

En cada terminal pulsa **`Ctrl + C`**. Primero el bot, luego la API.

---

## 6. Personalizar las respuestas

El texto ya no está en `bot.js`: lo arma el backend en
`barberia-api/src/modules/whatsapp/application/use-cases/reply-to-client-message.use-case.ts`.
Después de cambiarlo hay que desplegar el backend en Render (o reiniciarlo si usas `BACKEND_URL=http://localhost:3000`). El bot no hace falta reiniciarlo.

Las horas que se muestran salen de la app: horario de la semana, horas bloqueadas y citas agendadas. Si cambias algo en la app, la próxima respuesta ya lo refleja.

En `bot.js` solo quedan estos ajustes:

| Variable | Qué controla | Valor actual |
|----------|--------------|--------------|
| `BACKEND_URL` (variable de entorno) | Backend al que se le pide la respuesta | `https://iabarber.onrender.com` |
| `BACKEND_TIMEOUT_MS` | Cuánto esperar al backend (Render tarda ~50 s en despertar) | `60000` |
| `RESPONDER_EN_GRUPOS` | Si el bot responde en grupos | `false` |

---

## 7. Solución de problemas

### El bot no responde

Revisa en este orden:

1. **¿El bot está corriendo?** En la terminal 2 debe verse `✅ Bot escuchando mensajes...`. Si cerraste esa terminal, arráncalo otra vez.
2. **¿Escribiste desde otro teléfono?** Los mensajes propios se ignoran.
3. **¿Aparece `📩` en la terminal 2?**
   - **No aparece** → el mensaje no llega al bot. Comprueba que la API esté en `READY` (paso 2) y que el bot apunte al puerto correcto (`API_URL`).
   - **Aparece `❌ No se pudo responder: backend ...`** → el backend no respondió. Revisa que esté desplegado con el módulo de WhatsApp (`backend 404` = falta desplegar) o que esté corriendo si usas `BACKEND_URL=http://localhost:3000`. `The operation was aborted due to timeout` = Render tardó más de 60 s en despertar; vuelve a escribir.
   - **Aparece `❌ No se pudo responder: sendText ...`** → falló el envío por WhatsApp; el mensaje de error dice por qué.
4. **¿Era un audio, foto o sticker?** El bot solo responde a mensajes de texto.
5. **¿Era un grupo?** Por defecto no responde en grupos.

### `⚠️ Sin conexión con la API, reintentando en 5 s...`

La API (terminal 1) no está corriendo o está en otro puerto. Arráncala con `./start.sh`. El bot se reconecta solo.

### El puerto 8080 está ocupado

Mira qué lo usa:

```bash
sudo ss -ltnp 'sport = :8080'
sudo docker ps --format 'table {{.Names}}\t{{.Ports}}' | grep 8080
```

- Si es un contenedor Docker que no necesitas: `sudo docker stop <nombre>`
- Si prefieres no tocarlo, usa otro puerto:
  ```bash
  PORT=8081 ./start.sh                         # terminal 1
  API_URL=http://localhost:8081 node bot.js    # terminal 2
  ```

### Me vuelve a pedir el QR

La sesión caducó o se cerró desde el teléfono (Dispositivos vinculados → Cerrar sesión). Escanea el QR de nuevo en `http://localhost:8080/dashboard/`.

### Error al arrancar la API (`Bootstrap failed`, `TimeoutError`...)

1. Asegúrate de que **no hay otra copia corriendo** (otra terminal con `./start.sh`, o el contenedor Docker antiguo). Dos copias con la misma sesión chocan.
2. Cierra todo con `Ctrl + C` y vuelve a arrancar.
3. Si WhatsApp cambia y open-wa deja de funcionar, revisa si hay versión nueva:
   ```bash
   npm view @open-wa/wa-automate version
   ```
   y cambia el número `5.10.0` en `start.sh` por esa versión.

---

## 8. Seguridad y buenas prácticas

- 🔒 **`session.data.json` es como la llave de tu WhatsApp.** No lo compartas ni lo subas a GitHub.
- 🔒 La API no tiene contraseña: cualquiera con acceso a tu PC/red local podría enviar mensajes. No abras el puerto 8080 a Internet.
- ⚠️ open-wa **no es oficial**. WhatsApp puede bloquear números que:
  - envían mensajes masivos,
  - escriben a gente que no les ha escrito antes,
  - responden de forma instantánea a grandes volúmenes.
- ✅ Responder a quien te escribe (lo que hace este bot) es el uso de menor riesgo.

---

## Resumen rápido (chuleta)

```bash
# Solo la primera vez
sudo docker rm -f openwa

# Terminal 1 — API
cd ~/Escritorio/claude-whastapp && ./start.sh
# esperar: "WhatsApp Client ready"

# Terminal 2 — Bot
cd ~/Escritorio/claude-whastapp && node bot.js
# esperar: "✅ Bot escuchando mensajes"

# Probar: escribir "hola" desde OTRO teléfono

# Detener: Ctrl + C en cada terminal
```

| Dirección | Para qué |
|-----------|----------|
| http://localhost:8080/dashboard/ | Panel y QR |
| http://localhost:8080/api-docs/ | Documentación de la API |
| http://localhost:8080/health | Estado de la conexión |
