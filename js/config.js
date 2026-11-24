/**
 * js/config.js — ÚNICO archivo que necesitas editar para conectar con tu backend.
 * ---------------------------------------------------------------
 * API_URL: dirección de tu backend, SIN barra final.
 *   · Probando en local:      'http://localhost:3000'
 *   · Backend en Vercel:      'https://tu-backend.vercel.app'
 *   · Backend en Render:      'https://tu-backend.onrender.com'
 *
 * También se puede cambiar sin tocar el código, desde el botón ⚙ de la app
 * (se guarda en el navegador y tiene prioridad sobre sseste valor).
 */
window.APP_CONFIG = {
  API_URL: 'https://app-notasj19-backend.vercel.app/',

  // Cada cuántos milisegundos se recargan las notas solas (si "Auto-actualizar" está activo).
  AUTO_REFRESH_MS: 30000,

  // Notas que se piden por página (el botón "Cargar más" trae la siguiente).
  NOTAS_POR_PAGINA: 60,
};


//  eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTU0OTE2MTYsImlkIjoiMDFhMjBiOGItOTgwMS03ZGIzLTkzNTYtZWVhNzdkZmM0MzMyIiwia2lkIjoiejZOZFlmS1pYdkVHVXZFSTA0TXItdWE3Skg0X05xUTQxbjBjRlk3bzZpcyIsInJpZCI6IjM3YzNlODdhLWE5ZjMtNGI4MS05NzE3LWNiNzM4NTJmZTFjMyJ9.3ZTrZ-jYj0h3ForXjNYq3l5sCHnNFzmVuhC4PBIlWX6beBqKt-ewb272yaXNdXM2PvlTbv1EPfXcvuOzyxRNCg
//  libsql://appnotasj19-ethereal-scorpio-tozk8n.aws-sa-east-1.turso.io

