/**
 * js/app.js — lógica principal de appNotasJ19
 * ---------------------------------------------------------------
 * Orquesta la lista, la búsqueda, el editor y la conexión con la API.
 * Depende de: config.js (APP_CONFIG), api.js (NotasAPI) y ui.js (NotasUI).
 */
(() => {
  'use strict';

  const { $, toast } = NotasUI;
  const CFG = window.APP_CONFIG || {};
  const POR_PAGINA = CFG.NOTAS_POR_PAGINA || 60;

  /* ---------- Estado ---------- */
  const estado = {
    notas: [],
    total: 0,
    q: '',
    seq: 0,                 // numera las cargas para descartar respuestas viejas
    limites: { maxMediaBytes: 3 * 1024 * 1024 },
    editor: null,           // { id, version } al editar; { id: null } al crear
    imagen: undefined,      // undefined = sin cambios · null = quitar · { datos } = nueva
    adjunto: undefined,     // ídem, con { nombre, tipo, datos }
    idBorrar: null,
    temporizador: null,
    guardando: false,
  };

  /* ---------- Conexión / estado visible ---------- */
  function ponerEstado(tipo, texto) {
    $('estadoConexion').dataset.estado = tipo;
    $('textoEstado').textContent = texto;
  }

  function mostrarBanner(mensaje) {
    $('textoBanner').textContent = mensaje;
    $('banner').hidden = false;
  }
  const ocultarBanner = () => { $('banner').hidden = true; };

  /* ---------- Lista ---------- */
  const firma = (notas) => notas.map((n) => `${n.id}:${n.actualizada}`).join('|');

  function dibujar() {
    const lista = $('lista');
    lista.replaceChildren();
    const acciones = { editar: abrirEditar, borrar: pedirBorrar, ampliar: ampliarImagen, verTodo };
    const frag = document.createDocumentFragment();
    estado.notas.forEach((n) => frag.appendChild(NotasUI.tarjeta(n, acciones)));
    lista.appendChild(frag);

    const vacio = estado.notas.length === 0 && $('estadoConexion').dataset.estado === 'ok';
    $('vacio').hidden = !vacio;
    if (vacio) {
      $('vacioTitulo').textContent = estado.q ? 'Sin resultados' : 'El bloc está vacío';
      $('vacioTexto').textContent = estado.q
        ? `Ninguna nota coincide con «${estado.q}».`
        : 'Sé el primero: pulsa «+ Nueva nota».';
    }
    $('btnMas').hidden = estado.notas.length >= estado.total;
    $('contador').textContent = estado.total
      ? `${estado.q ? `${estado.total} resultado${estado.total === 1 ? '' : 's'}` : `${estado.total} nota${estado.total === 1 ? '' : 's'}`}`
      : '';
  }

  /**
   * Carga notas del servidor.
   * @param {object} op  { agregar: pagina siguiente, silencioso: autoactualización (sin avisos ni redibujo si nada cambió) }
   */
  async function cargar({ agregar = false, silencioso = false } = {}) {
    const miSeq = ++estado.seq;
    const btn = $('btnRefresh');
    if (!silencioso) btn.classList.add('cargando');
    if (!silencioso && !agregar && !estado.notas.length) ponerEstado('conectando', 'Conectando…');
    try {
      const desplazamiento = agregar ? estado.notas.length : 0;
      // En una recarga se piden al menos tantas notas como ya se ven, para no "perder" las de "Cargar más".
      const limite = agregar ? POR_PAGINA : Math.max(POR_PAGINA, estado.notas.length);
      const r = await NotasAPI.listar({ q: estado.q, limite, desplazamiento });
      if (miSeq !== estado.seq) return; // llegó tarde: ya hay una carga más nueva

      const nuevas = agregar ? estado.notas.concat(r.notas) : r.notas;
      const igual = !agregar && firma(nuevas) === firma(estado.notas) && r.total === estado.total;
      estado.notas = nuevas;
      estado.total = r.total;
      ponerEstado('ok', 'Conectado');
      ocultarBanner();
      if (!igual) dibujar();
      else if ($('estadoConexion').dataset.estado === 'ok') $('vacio').hidden = estado.notas.length > 0;
      if (!silencioso && !agregar) toastRefresh();
    } catch (err) {
      if (miSeq !== estado.seq) return;
      ponerEstado('error', 'Sin conexión');
      // Una recarga silenciosa que falla solo avisa si todavía no había nada en pantalla.
      if (!silencioso || estado.notas.length === 0 || !$('banner').hidden) mostrarBanner(err.message);
    } finally {
      if (miSeq === estado.seq) btn.classList.remove('cargando');
    }
  }

  let refrescoManual = false;
  function toastRefresh() {
    if (refrescoManual) { refrescoManual = false; toast('Notas actualizadas', 'ok'); }
  }

  async function cargarLimites() {
    try { estado.limites = await NotasAPI.configuracion(); } catch { /* se usan los valores por defecto */ }
    $('ayudaLimite').textContent =
      `Imagen + archivo: máximo ${NotasUI.tamano(estado.limites.maxMediaBytes)} por guardado. Las fotos grandes se reducen solas.`;
  }

  async function verTodo(nota, parrafo, boton) {
    if (parrafo.classList.contains('abierta')) {
      parrafo.classList.remove('abierta');
      parrafo.textContent = nota.resumen;
      boton.textContent = 'Ver todo';
      return;
    }
    boton.disabled = true;
    try {
      const completa = await NotasAPI.obtener(nota.id);
      parrafo.textContent = completa.contenido;
      parrafo.classList.add('abierta');
      boton.textContent = 'Ver menos';
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      boton.disabled = false;
    }
  }

  /* ---------- Búsqueda en tiempo real ---------- */
  function alBuscar() {
    clearTimeout(estado.temporizador);
    estado.temporizador = setTimeout(() => {
      estado.q = $('buscador').value.trim();
      cargar();
    }, 250);
  }

  /* ---------- Editor ---------- */
  function reiniciarArchivos() {
    estado.imagen = undefined;
    estado.adjunto = undefined;
    $('inImagen').value = '';
    $('inAdjunto').value = '';
  }

  function pintarImagen(src) {
    $('previaImagen').hidden = !src;
    if (src) $('previaImagen').src = src; else $('previaImagen').removeAttribute('src');
    $('btnQuitarImagen').hidden = !src;
  }

  function pintarAdjunto(texto) {
    $('infoAdjunto').hidden = !texto;
    $('infoAdjunto').textContent = texto || '';
    $('btnQuitarAdjunto').hidden = !texto;
  }

  function errorEditor(msg) {
    $('errorEditor').textContent = msg || '';
    $('errorEditor').hidden = !msg;
  }

  function abrirNueva() {
    estado.editor = { id: null };
    reiniciarArchivos();
    $('tituloEditor').textContent = 'Nueva nota';
    $('inTitulo').value = '';
    $('inContenido').value = '';
    pintarImagen(null);
    pintarAdjunto(null);
    errorEditor('');
    $('modalEditor').showModal();
    $('inTitulo').focus();
  }

  async function abrirEditar(nota) {
    let completa;
    try {
      completa = await NotasAPI.obtener(nota.id);
    } catch (err) {
      toast(err.estado === 404 ? 'Esa nota ya no existe.' : err.message, 'error');
      cargar({ silencioso: true });
      return;
    }
    estado.editor = { id: completa.id, version: completa.actualizada };
    reiniciarArchivos();
    $('tituloEditor').textContent = 'Editar nota';
    $('inTitulo').value = completa.titulo;
    $('inContenido').value = completa.contenido;
    pintarImagen(completa.imagen ? NotasAPI.urlMedia(completa.imagen, completa.actualizada) : null);
    pintarAdjunto(completa.adjunto ? `📎 ${completa.adjunto.nombre} (${NotasUI.tamano(completa.adjunto.tamano)})` : null);
    errorEditor('');
    $('modalEditor').showModal();
    $('inTitulo').focus();
  }

  async function elegirImagen() {
    const archivo = $('inImagen').files[0];
    if (!archivo) return;
    errorEditor('');
    if (!/^image\/(png|jpeg|gif|webp)$/.test(archivo.type)) {
      $('inImagen').value = '';
      return errorEditor('La imagen debe ser PNG, JPG, GIF o WEBP.');
    }
    try {
      const final = await NotasUI.comprimirImagen(archivo);
      estado.imagen = { datos: await NotasUI.aBase64(final) };
      pintarImagen(await NotasUI.aDataUrl(final));
    } catch (err) {
      errorEditor(err.message);
    }
  }

  async function elegirAdjunto() {
    const archivo = $('inAdjunto').files[0];
    if (!archivo) return;
    errorEditor('');
    if (archivo.size > estado.limites.maxMediaBytes) {
      $('inAdjunto').value = '';
      return errorEditor(`El archivo pesa ${NotasUI.tamano(archivo.size)} y el máximo es ${NotasUI.tamano(estado.limites.maxMediaBytes)}.`);
    }
    try {
      estado.adjunto = { nombre: archivo.name, tipo: archivo.type || 'application/octet-stream', datos: await NotasUI.aBase64(archivo) };
      pintarAdjunto(`📎 ${archivo.name} (${NotasUI.tamano(archivo.size)})`);
    } catch (err) {
      errorEditor(err.message);
    }
  }

  function quitarImagen() {
    estado.imagen = null;
    $('inImagen').value = '';
    pintarImagen(null);
  }

  function quitarAdjunto() {
    estado.adjunto = null;
    $('inAdjunto').value = '';
    pintarAdjunto(null);
  }

  async function guardar(evento) {
    evento.preventDefault();
    if (estado.guardando) return;
    errorEditor('');

    const cuerpo = { titulo: $('inTitulo').value, contenido: $('inContenido').value };
    const editando = estado.editor && estado.editor.id;
    if (estado.imagen !== undefined) cuerpo.imagen = estado.imagen;
    if (estado.adjunto !== undefined) cuerpo.adjunto = estado.adjunto;
    // Al crear, "quitar" no significa nada: se omite.
    if (!editando) {
      if (cuerpo.imagen === null) delete cuerpo.imagen;
      if (cuerpo.adjunto === null) delete cuerpo.adjunto;
    } else {
      cuerpo.version = estado.editor.version;
    }

    estado.guardando = true;
    const btn = $('btnGuardar');
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    try {
      try {
        if (editando) await NotasAPI.actualizar(estado.editor.id, cuerpo);
        else await NotasAPI.crear(cuerpo);
      } catch (err) {
        if (err.estado === 409 && editando) {
          const sobrescribir = window.confirm('Otra persona modificó esta nota mientras la editabas.\n\nAceptar = sobrescribir con tu versión.\nCancelar = volver al editor.');
          if (!sobrescribir) throw new NotasAPI.ErrorAPI('Nota no guardada: hay una versión más reciente en el servidor. Copia tu texto y pulsa Refresh.', { estado: 409 });
          await NotasAPI.actualizar(estado.editor.id, { ...cuerpo, forzar: true });
        } else {
          throw err;
        }
      }
      $('modalEditor').close();
      toast(editando ? 'Nota actualizada' : 'Nota creada', 'ok');
      await cargar({ silencioso: true });
    } catch (err) {
      errorEditor(err.message);
    } finally {
      estado.guardando = false;
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  }

  /* ---------- Eliminar ---------- */
  function pedirBorrar(nota) {
    estado.idBorrar = nota.id;
    $('textoBorrar').textContent = `«${nota.titulo || 'Sin título'}» se eliminará para todos. Esta acción no se puede deshacer.`;
    $('modalBorrar').showModal();
  }

  async function confirmarBorrar() {
    const id = estado.idBorrar;
    $('modalBorrar').close();
    if (!id) return;
    try {
      await NotasAPI.eliminar(id);
      toast('Nota eliminada', 'ok');
    } catch (err) {
      if (err.estado !== 404) toast(err.message, 'error'); // 404 = ya la había borrado otra persona
    }
    cargar({ silencioso: true });
  }

  /* ---------- Imagen ampliada ---------- */
  function ampliarImagen(src) {
    $('imagenGrande').src = src;
    $('modalImagen').showModal();
  }

  /* ---------- Configuración de la conexión ---------- */
  function abrirConfig() {
    $('inApiUrl').value = NotasAPI.base();
    $('resultadoConexion').textContent = '';
    $('resultadoConexion').className = 'ayuda';
    $('modalConfig').showModal();
  }

  async function probarConexion() {
    const url = $('inApiUrl').value.trim();
    const r = $('resultadoConexion');
    if (!NotasAPI.urlValida(url)) {
      r.className = 'ayuda mal';
      r.textContent = 'La URL no es válida. Debe empezar por http:// o https://';
      return;
    }
    r.className = 'ayuda';
    r.textContent = 'Probando…';
    try {
      const s = await NotasAPI.salud(url);
      r.className = 'ayuda ok';
      r.textContent = `Conexión correcta. El servidor tiene ${s.notas} nota${s.notas === 1 ? '' : 's'}.`;
    } catch (err) {
      r.className = 'ayuda mal';
      r.textContent = err.message;
    }
  }

  function guardarConfig() {
    const url = $('inApiUrl').value.trim();
    if (!NotasAPI.urlValida(url)) {
      $('resultadoConexion').className = 'ayuda mal';
      $('resultadoConexion').textContent = 'La URL no es válida. Debe empezar por http:// o https://';
      return;
    }
    NotasAPI.guardarBase(url);
    $('modalConfig').close();
    reiniciarTodo();
  }

  function restablecerConfig() {
    NotasAPI.restablecerBase();
    $('inApiUrl').value = NotasAPI.base();
    $('resultadoConexion').className = 'ayuda ok';
    $('resultadoConexion').textContent = 'Restablecida a la URL de js/config.js.';
    reiniciarTodo();
  }

  function reiniciarTodo() {
    estado.notas = [];
    estado.total = 0;
    dibujar();
    cargarLimites();
    cargar();
  }

  /* ---------- Auto-actualización ---------- */
  function iniciarAuto() {
    const ms = CFG.AUTO_REFRESH_MS || 30000;
    setInterval(() => {
      if (!$('autoRefresh').checked || document.hidden) return;
      if (document.querySelector('dialog[open]')) return; // no molestar mientras se edita
      cargar({ silencioso: true });
    }, ms);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && $('autoRefresh').checked) cargar({ silencioso: true });
    });
  }

  /* ---------- Arranque ---------- */
  function conectarEventos() {
    $('buscador').addEventListener('input', alBuscar);
    $('btnRefresh').addEventListener('click', () => { refrescoManual = true; cargar(); });
    $('btnNueva').addEventListener('click', abrirNueva);
    $('btnMas').addEventListener('click', () => cargar({ agregar: true }));
    $('btnReintentar').addEventListener('click', () => cargar());
    $('btnConfig').addEventListener('click', abrirConfig);
    $('btnBannerConfig').addEventListener('click', abrirConfig);

    $('formEditor').addEventListener('submit', guardar);
    $('btnCancelar').addEventListener('click', () => $('modalEditor').close());
    $('inImagen').addEventListener('change', elegirImagen);
    $('inAdjunto').addEventListener('change', elegirAdjunto);
    $('btnQuitarImagen').addEventListener('click', quitarImagen);
    $('btnQuitarAdjunto').addEventListener('click', quitarAdjunto);

    $('btnNoBorrar').addEventListener('click', () => $('modalBorrar').close());
    $('btnSiBorrar').addEventListener('click', confirmarBorrar);
    $('modalImagen').addEventListener('click', () => $('modalImagen').close());

    $('btnProbar').addEventListener('click', probarConexion);
    $('btnGuardarConfig').addEventListener('click', guardarConfig);
    $('btnRestablecer').addEventListener('click', restablecerConfig);
    $('btnCerrarConfig').addEventListener('click', () => $('modalConfig').close());

    // Cerrar una ventana al pulsar fuera de su caja (sobre el fondo oscuro).
    document.querySelectorAll('dialog.modal:not(.modal--imagen)').forEach((d) => {
      d.addEventListener('mousedown', (e) => { if (e.target === d) d.close(); });
    });
  }

  conectarEventos();
  cargarLimites();
  cargar();
  iniciarAuto();
})();
