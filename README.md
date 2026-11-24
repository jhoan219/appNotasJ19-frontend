# appNotasJ19 · Frontend

Interfaz web (HTML5 + CSS3 + JavaScript puro, sin dependencias ni compilación) del bloc de notas abierto **appNotasJ19**. Se conecta al backend por URL.

## Estructura

```
appNotasJ19-frontend/
├── index.html
├── css/styles.css
├── js/
│   ├── config.js     ← aquí pones la URL de tu backend
│   ├── api.js        Cliente de la API REST
│   ├── ui.js         Utilidades: avisos, archivos, compresión de imágenes, tarjetas
│   └── app.js        Lógica: lista, búsqueda, editor, conexión
└── assets/favicon.svg
```

## Configurar

Edita `js/config.js`:
```js
API_URL: 'https://tu-backend.vercel.app'   // sin barra final
```
También puede cambiarse sin tocar código desde el botón ⚙ de la app (se guarda en ese navegador y tiene prioridad).

## Probar en local

Con el backend corriendo en `http://localhost:3000` (valor por defecto):
```bash
cd appNotasJ19-frontend
python3 -m http.server 8080      # o: npx serve
```
Abre http://localhost:8080. También funciona abriendo `index.html` con doble clic.

## Subir a GitHub y publicar

```bash
git init && git add . && git commit -m "appNotasJ19 frontend"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/appnotasj19-frontend.git
git push -u origin main
```
- **GitHub Pages**: repositorio → *Settings → Pages* → Branch `main`, carpeta `/ (root)` → Save.
- **Vercel**: *Add New → Project* → importa el repo → *Framework: Other* → Deploy (sin comandos de build).

## Cómo se usa

- **Buscador**: filtra mientras escribes (título y contenido).
- **Refresh**: vuelve a pedir las notas al servidor. Además se actualiza solo cada 30 s (casilla *Auto-actualizar*).
- **Nueva nota / Editar**: título, texto largo, imagen con previsualización (las fotos grandes se reducen solas) y un documento adjunto (PDF, Word, etc.).
- Si dos personas editan la misma nota, la app avisa y permite sobrescribir.
