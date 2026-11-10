# Restaurar el bot (después de apagar el PC o si deja de responder)

## 1. Arrancar

**Terminal 1 — API**
```bash
cd ~/Escritorio/claude-whastapp && ./start.sh
```
Espera `WhatsApp Client ready`. Si pide QR, escanéalo en http://localhost:8080/dashboard/

**Terminal 2 — Bot** (abre otra terminal)
```bash
cd ~/Escritorio/claude-whastapp && node bot.js
```
Espera `✅ Bot escuchando mensajes`.

**Probar:** escribe `hola` desde **otro teléfono**. Debe salir `📩` y `📤` en la terminal 2.
La primera respuesta puede tardar ~1 min (Render se está despertando).

> Deja las dos terminales y la ventana de Chrome de open-wa abiertas.

## 2. Si no responde

| Ves en la terminal 2 | Solución |
|---|---|
| Nada al escribir | Terminal 1: `Ctrl + C` y `./start.sh` otra vez |
| `⚠️ Sin conexión con la API` | La API no está corriendo: haz el paso 1 |
| `429 Rate limit exceeded` | Cierra la pestaña `/dashboard/` y reinicia el bot |
| `timeout` | Render tardó en despertar: vuelve a escribir |

Si `./start.sh` falla, revisa que no haya otra copia corriendo (`ps aux | grep wa-automate`) y ciérrala.

## 3. Apagar

`Ctrl + C` en la terminal 2 (bot) y luego en la terminal 1 (API).
