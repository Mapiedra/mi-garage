# Mi Garaje de Marcas 🚗

PWA de juegos con logotipos de marcas de coches y voz en español, pensada para un niño con autismo
que empieza a leer: interfaz predecible, colores suaves, botones grandes, sin tiempo ni "perder".

**Web:** https://mapiedra.github.io/mi-garage/ (en el móvil: menú del navegador → *Añadir a pantalla de inicio*).

## Juegos
1. **¿Cuál es?** — se ve un logo y se elige su nombre entre 2–4 opciones (tocar un nombre lo pronuncia).
2. **Escucha y toca** — la voz dice una marca y hay que tocar su logo.
3. **Puzle** — montar el logo arrastrando las piezas (o tocando pieza y luego hueco). Solo encajan en su sitio.
4. **Parejas** — memoria con logos; al girar cada carta se oye la marca.
5. **Escribe la marca** — tocar las letras en orden; cada letra se pronuncia y hay pista tras dos fallos.
6. **Mi garaje** — todas las marcas para explorar, con las estrellas ganadas.

## Ajustes (para adultos)
Mantener pulsado el engranaje ⚙️ durante 2 segundos. Se puede elegir el nº de opciones, piezas del puzle,
parejas, velocidad y voz, sonidos, animaciones mínimas y qué marcas aparecen (sus favoritas).

## Desarrollo
Sin compilación: HTML, CSS y JavaScript (módulos ES).

```bash
npm install          # solo hace falta para regenerar imágenes (sharp)
npm start            # http://localhost:5173
npm run logos        # vuelve a descargar y normalizar los logotipos
node scripts/make-icons.mjs   # regenera los iconos de la app
```

- Marcas y su pronunciación: `js/brands.js` (campo `say`, escrito como suena en español).
- Para añadir una marca: añádela a `js/brands.js` (el `slug` debe existir en el dataset) y ejecuta `npm run logos`.
- Al publicar cambios, sube `VERSION` en `sw.js` para que los dispositivos instalados se actualicen.
- Cada `push` a `main` se publica solo en GitHub Pages (`.github/workflows/pages.yml`).

## Créditos y aviso
Logotipos del dataset abierto [filippofilip95/car-logos-dataset](https://github.com/filippofilip95/car-logos-dataset).
Los logotipos y nombres son marcas registradas de sus respectivos propietarios; esta app es de uso familiar,
educativo y sin ánimo de lucro.
