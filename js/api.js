/**
 * js/api.js — cliente de la API REST de appNotasJ19
 * ---------------------------------------------------------------
 * Único lugar que habla con el backend. Todas las funciones devuelven
 * promesas y, si algo falla, lanzan un ErrorAPI con un mensaje legible:
 *   err.estado  código HTTP (0 si no hubo respuesta)
 *   err.datos   cuerpo JSON de la respuesta de error (p. ej. la nota en un 409)
 *   err.red     true si el servidor no se pudo alcanzar
 */
const NotasAPI = (() => {
  'use strict';

  const CLAVE_URL = 'appnotasj19_api_url';
  const TIMEOUT_MS = 25000;

  class ErrorAPI extends Error {
    constructor(mensaje, { estado = 0, datos = null, red = false } = {}) {
      super(mensaje);
      this.estado = estado;
      this.datos = datos;
      this.red = red;
    }
  }

  /* ---------- URL base (configurable) ---------- */

  const limpiarUrl = (url) => String(url || '').trim().replace(/\/+$/, '');

  function base() {
    let guardada = '';
    try { guardada = localStorage.getItem(CLAVE_URL) || ''; } catch { /* sin localStorage */ }
    return limpiarUrl(guardada || (window.APP_CONFIG && window.APP_CONFIG.API_URL));
  }

  function urlValida(url) {
    try {
      const u = new URL(limpiarUrl(url));
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function guardarBase(url) {
    try { localStorage.setItem(CLAVE_URL, limpiarUrl(url)); } catch { /* ignorar */ }
  }

  function restablecerBase() {
    try { localStorage.removeItem(CLAVE_URL); } catch { /* ignorar */ }
  }

  /* ---------- Petición genérica ---------- */

  async function peticion(ruta, { metodo = 'GET', cuerpo, urlBase } = {}) {
    const destino = limpiarUrl(urlBase) || base();
    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(destino + ruta, {
        method: metodo,
        headers: cuerpo !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
        signal: control.signal,
      });
    } catch (err) {
      throw new ErrorAPI(
        err.name === 'AbortError'
          ? 'El servidor tardó demasiado en responder.'
          : `No se pudo conectar con el servidor (${destino || 'sin URL configurada'}). ¿Está encendido y la URL es correcta?`,
        { red: true },
      );
    } finally {
      clearTimeout(temporizador);
    }

    let datos = null;
    try { datos = await res.json(); } catch { /* sin cuerpo JSON */ }

    if (!res.ok) {
      throw new ErrorAPI((datos && datos.error) || `El servidor respondió ${res.status}.`, { estado: res.status, datos });
    }
    if (datos === null) {
      throw new ErrorAPI('Respuesta inesperada: la URL configurada no parece ser el backend de appNotasJ19.', { estado: res.status });
    }
    return datos;
  }

  /* ---------- Endpoints ---------- */

  return {
    ErrorAPI,
    base, urlValida, guardarBase, restablecerBase,

    salud: (urlBase) => peticion('/api/salud', { urlBase }),
    configuracion: () => peticion('/api/config'),

    listar({ q = '', limite = 60, desplazamiento = 0 } = {}) {
      const p = new URLSearchParams({ limite, desplazamiento });
      if (q) p.set('q', q);
      return peticion(`/api/notas?${p}`);
    },
    obtener: (id) => peticion(`/api/notas/${encodeURIComponent(id)}`),
    crear: (datos) => peticion('/api/notas', { metodo: 'POST', cuerpo: datos }),
    actualizar: (id, datos) => peticion(`/api/notas/${encodeURIComponent(id)}`, { metodo: 'PUT', cuerpo: datos }),
    eliminar: (id) => peticion(`/api/notas/${encodeURIComponent(id)}`, { metodo: 'DELETE' }),

    /** URL completa de una imagen o adjunto. `version` evita ver una imagen vieja en caché. */
    urlMedia: (media, version) => `${base()}${media.url}?v=${version}`,
  };
})();
