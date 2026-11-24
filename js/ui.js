/**
 * js/ui.js — utilidades de interfaz (sin lógica de la aplicación)
 * ---------------------------------------------------------------
 * Avisos emergentes, formato de fechas/tamaños, lectura de archivos a Base64,
 * compresión de imágenes y dibujo de las tarjetas de notas.
 */
const NotasUI = (() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  /* ---------- Avisos ---------- */
  function toast(mensaje, tipo = '') {
    const el = document.createElement('div');
    el.className = `toast${tipo ? ` toast--${tipo}` : ''}`;
    el.textContent = mensaje;
    $('toasts').appendChild(el);
    setTimeout(() => el.remove(), tipo === 'error' ? 6000 : 3000);
  }

  /* ---------- Formato ---------- */
  function tamano(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function fecha(ms) {
    return new Date(ms).toLocaleString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  /* ---------- Archivos ---------- */
  function aBase64(archivo) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result).split(',')[1] || '');
      lector.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      lector.readAsDataURL(archivo);
    });
  }

  function aDataUrl(archivo) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result));
      lector.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      lector.readAsDataURL(archivo);
    });
  }

  /**
   * Reduce una imagen grande (máx. 1920 px, JPEG 85 %) para que quepa en el límite
   * del servidor. Solo actúa si pesa más de 1,5 MB; GIF se deja igual (perdería la animación).
   */
  async function comprimirImagen(archivo) {
    if (archivo.size <= 1.5 * 1024 * 1024 || archivo.type === 'image/gif') return archivo;
    try {
      const bitmap = await createImageBitmap(archivo);
      const escala = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * escala);
      canvas.height = Math.round(bitmap.height * escala);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; // JPEG no tiene transparencia
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
      return blob && blob.size < archivo.size ? blob : archivo;
    } catch {
      return archivo; // si el navegador no puede, se envía tal cual (el servidor validará el tamaño)
    }
  }

  /* ---------- Tarjetas ---------- */
  function el(etiqueta, clase, texto) {
    const e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto; // textContent: nada de HTML inyectado
    return e;
  }

  /**
   * Crea la tarjeta de una nota. `acciones` = { editar(nota), borrar(nota), ampliar(url) }.
   * Todo el texto entra con textContent, así que el contenido de otros usuarios no puede inyectar HTML.
   */
  function tarjeta(nota, acciones) {
    const art = el('article', 'nota');
    art.dataset.id = nota.id;

    if (nota.imagen) {
      const img = el('img', 'nota__img');
      img.loading = 'lazy';
      img.alt = nota.titulo ? `Imagen de «${nota.titulo}»` : 'Imagen de la nota';
      img.src = NotasAPI.urlMedia(nota.imagen, nota.actualizada);
      img.addEventListener('click', () => acciones.ampliar(img.src));
      art.appendChild(img);
    }

    const cuerpo = el('div', 'nota__cuerpo');
    cuerpo.appendChild(el('h3', `nota__titulo${nota.titulo ? '' : ' sin'}`, nota.titulo || 'Sin título'));
    if (nota.resumen) {
      const p = el('p', 'nota__texto', nota.resumen);
      cuerpo.appendChild(p);
      if (nota.truncado || nota.resumen.length > 280) {
        const mas = el('button', 'nota__mas', 'Ver todo');
        mas.type = 'button';
        mas.addEventListener('click', () => acciones.verTodo(nota, p, mas));
        cuerpo.appendChild(mas);
      }
    }
    art.appendChild(cuerpo);

    if (nota.adjunto) {
      const a = el('a', 'nota__adj');
      a.href = NotasAPI.urlMedia(nota.adjunto, nota.actualizada);
      a.setAttribute('download', nota.adjunto.nombre);
      a.rel = 'noopener';
      a.appendChild(el('span', '', `📎 ${nota.adjunto.nombre}`));
      a.appendChild(el('small', '', tamano(nota.adjunto.tamano)));
      art.appendChild(a);
    }

    const pie = el('div', 'nota__pie');
    pie.appendChild(el('span', '', fecha(nota.actualizada)));
    const acc = el('div', 'nota__acc');
    const bEditar = el('button', '', 'Editar');
    bEditar.type = 'button';
    bEditar.addEventListener('click', () => acciones.editar(nota));
    const bBorrar = el('button', 'borrar', 'Eliminar');
    bBorrar.type = 'button';
    bBorrar.addEventListener('click', () => acciones.borrar(nota));
    acc.append(bEditar, bBorrar);
    pie.appendChild(acc);
    art.appendChild(pie);
    return art;
  }

  return { $, toast, tamano, fecha, aBase64, aDataUrl, comprimirImagen, tarjeta };
})();
