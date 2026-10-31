# LBA Operativos: registro de pacientes escaneando el DNI

App web instalable (PWA). Funciona **sin internet** una vez instalada y anda en iPhone y Android.

## Qué hace
- Un operativo por celular (club/lugar + fecha). Cada coordinador trabaja en su propio celu, así que varios operativos el mismo día no se mezclan.
- **Escanear DNI** con la cámara: lee el código PDF417 del dorso, saca APELLIDO, NOMBRE y DNI. Hace un pitido y se pone verde. Si el DNI ya estaba cargado, avisa en amarillo y no lo duplica.
- **Sacar foto del DNI**: respaldo por si el escaneo en vivo cuesta (poca luz, celular viejo).
- **Carga manual**: para DNI en libreta o con el código dañado. Valida que el DNI tenga 7 u 8 números y que no esté repetido.
- **Lector externo**: si conectás un lector 2D Bluetooth (modo teclado), tocás el campo y escaneás.
- Todo en MAYÚSCULAS y sin tildes, como figura en el DNI (se mantiene la Ñ).
- **Exportar Excel**: dos columnas, `APELLIDO Y NOMBRE` | `DNI`. En el celu se abre el menú para compartir (WhatsApp, Mail, Archivos).
- Los datos quedan guardados en el celu aunque se cierre la app. Al borrar un operativo, la app avisa si todavía no se exportó.

## Publicarla (una sola vez, gratis, con GitHub Pages)
Para usar la cámara, la app tiene que estar en una dirección `https://`.
1. En GitHub, creá un repositorio nuevo (por ejemplo `lba-operativos`).
2. Descomprimí el zip y subí **los 12 archivos** (Add file → Upload files → seleccioná todos juntos). Van todos sueltos en la raíz del repo, sin carpetas. Si ya había archivos de antes, se reemplazan solos.
3. Andá a *Settings → Pages*, en *Branch* elegí `main` y `/ (root)`, y tocá *Save*.
4. Al minuto queda en `https://TU-USUARIO.github.io/lba-operativos/`.

## Instalarla en el celular (con internet, una vez)
- **iPhone**: abrí el link en **Safari**, tocá *Compartir*, después *Agregar a inicio*. Abrila desde el ícono y aceptá el permiso de cámara.
- **Android**: abrí el link en **Chrome**, tocá el menú ⋮ y después *Instalar app* (o *Agregar a pantalla principal*).

Antes del primer operativo sin señal: abrila una vez con internet y fijate que abajo de la pantalla de inicio diga **"Lista para usar sin internet"**.

## Consejos para escanear
- El código de barras que se escanea es el **rectángulo del dorso** del DNI, no el del frente.
- Buena luz y sin reflejos (inclinar un poco el DNI ayuda con el plastificado).
- Que el código ocupe casi todo el ancho del recuadro. Si no lee en 3 o 4 segundos, alejalo y acercalo despacio.

## Actualizar la app
Si se cambia algún archivo, hay que subir el número de `VERSION` en `sw.js` (por ejemplo `v1` → `v2`). Los celulares toman la versión nueva la próxima vez que abran la app con internet.
