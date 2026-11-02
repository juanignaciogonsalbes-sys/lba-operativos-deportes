/* LBA Operativos — registro de pacientes por escaneo de DNI.
   Todo se guarda en el celular (localStorage). No usa servidor. */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const CLAVE = "lba_operativos_v1";

  // ---------- Datos ----------
  let ops = cargar();
  let opActual = null;

  function cargar() {
    try { return JSON.parse(localStorage.getItem(CLAVE)) || []; }
    catch (e) { return []; }
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(ops)); }
    catch (e) { toast("No se pudo guardar en el celular. Exportá el Excel ya."); }
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function op() { return ops.find((o) => o.id === opActual); }
  function hoyISO() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  function fechaLinda(iso) {
    if (!iso) return "";
    const [a, m, d] = iso.split("-");
    return d + "/" + m + "/" + a;
  }
  function horaAhora() {
    return new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  function an(p) { return (p.apellido + " " + p.nombre).trim(); }

  // Agrega un paciente. Devuelve "ok" | "repetido" con el paciente.
  function agregarPaciente(datos, origen) {
    const o = op();
    const existente = o.pacientes.find((p) => p.dni === datos.dni);
    if (existente) return { estado: "repetido", p: existente };
    const p = {
      dni: datos.dni,
      apellido: DNI.limpiarTexto(datos.apellido),
      nombre: DNI.limpiarTexto(datos.nombre),
      origen: origen,
      hora: horaAhora(),
    };
    o.pacientes.push(p);
    guardar();
    return { estado: "ok", p: p };
  }

  // ---------- Navegación ----------
  function mostrar(vista) {
    $("v-inicio").classList.toggle("oculto", vista !== "inicio");
    $("v-op").classList.toggle("oculto", vista !== "op");
    window.scrollTo(0, 0);
  }

  // ---------- Pantalla inicio ----------
  function renderInicio() {
    const cont = $("lista-ops");
    cont.innerHTML = "";
    if (!ops.length) {
      cont.innerHTML = '<div class="vacio">Todavía no hay operativos.<br>Creá uno para empezar a escanear.</div>';
      return;
    }
    [...ops].sort((a, b) => (b.fecha + b.creado).localeCompare(a.fecha + a.creado)).forEach((o) => {
      const b = document.createElement("button");
      b.className = "tarjeta op";
      b.innerHTML =
        '<div class="info"><div class="nom"></div><div class="meta"></div></div><div class="num"></div>';
      b.querySelector(".nom").textContent = o.nombre;
      b.querySelector(".meta").textContent = fechaLinda(o.fecha) + (o.exportado ? " · exportado" : "");
      b.querySelector(".num").textContent = o.pacientes.length;
      b.onclick = () => abrirOp(o.id);
      cont.appendChild(b);
    });
  }

  // ---------- Pantalla operativo ----------
  function abrirOp(id) {
    opActual = id;
    renderOp();
    mostrar("op");
  }

  function renderOp() {
    const o = op();
    if (!o) return;
    $("op-nombre").textContent = o.nombre;
    $("op-fecha").textContent = fechaLinda(o.fecha);
    $("op-contador").textContent = o.pacientes.length;
    $("esc-op").textContent = o.nombre;
    $("esc-cont").textContent = o.pacientes.length;

    const filtro = $("in-buscar").value.trim().toUpperCase();
    $("in-buscar").classList.toggle("oculto", o.pacientes.length < 15);

    const cont = $("lista-pac");
    cont.innerHTML = "";
    if (!o.pacientes.length) {
      cont.innerHTML = '<div class="vacio">Sin pacientes todavía.</div>';
      return;
    }
    for (let i = o.pacientes.length - 1; i >= 0; i--) {
      const p = o.pacientes[i];
      if (filtro && !an(p).includes(filtro) && !p.dni.includes(filtro)) continue;
      const fila = document.createElement("div");
      fila.className = "pac";
      fila.innerHTML =
        '<div class="n"></div><div class="datos"><div class="an"></div><div class="dni"></div></div>' +
        '<button aria-label="Editar">✎</button><button aria-label="Borrar">✕</button>';
      fila.querySelector(".n").textContent = i + 1;
      fila.querySelector(".an").textContent = an(p);
      const dniEl = fila.querySelector(".dni");
      dniEl.textContent = "DNI " + Number(p.dni).toLocaleString("es-AR") + " · " + p.hora;
      if (p.origen !== "escaneo") {
        const t = document.createElement("span");
        t.className = "tag manual";
        t.textContent = p.origen === "foto" ? "FOTO" : "MANUAL";
        if (p.origen === "foto") t.className = "tag";
        dniEl.appendChild(t);
      }
      const [bEd, bBo] = fila.querySelectorAll("button");
      bEd.onclick = () => abrirDialogoPaciente(p);
      bBo.onclick = () => {
        if (confirm("¿Borrar a " + an(p) + "?")) {
          o.pacientes.splice(o.pacientes.indexOf(p), 1);
          guardar(); renderOp();
        }
      };
      cont.appendChild(fila);
    }
  }

  // ---------- Diálogos (con respaldo para iOS viejo) ----------
  const hayDialog = typeof HTMLDialogElement === "function" && "showModal" in HTMLDialogElement.prototype;
  function abrirDlg(id) {
    const d = $(id);
    if (hayDialog) d.showModal(); else d.classList.add("fallback-abierto");
  }
  function cerrarDlg(id) {
    const d = $(id);
    if (hayDialog) { if (d.open) d.close(); } else d.classList.remove("fallback-abierto");
  }
  document.querySelectorAll("dialog .cancelar").forEach((b) => {
    b.addEventListener("click", () => cerrarDlg(b.closest("dialog").id));
  });

  // ---------- Diálogo operativo ----------
  let editandoOp = null;
  function abrirDialogoOp(o) {
    editandoOp = o || null;
    $("d-op-tit").textContent = o ? "Editar operativo" : "Nuevo operativo";
    $("op-in-nombre").value = o ? o.nombre : "";
    $("op-in-fecha").value = o ? o.fecha : hoyISO();
    abrirDlg("d-op");
  }
  $("f-op").addEventListener("submit", (e) => {
    e.preventDefault();
    const nombre = $("op-in-nombre").value.trim();
    const fecha = $("op-in-fecha").value || hoyISO();
    if (!nombre) return;
    cerrarDlg("d-op");
    if (editandoOp) {
      editandoOp.nombre = nombre; editandoOp.fecha = fecha;
      guardar(); renderOp();
    } else {
      const o = { id: uid(), nombre, fecha, creado: new Date().toISOString(), pacientes: [] };
      ops.push(o); guardar(); abrirOp(o.id);
    }
  });

  // ---------- Diálogo paciente (manual / editar) ----------
  let editandoPac = null;
  function abrirDialogoPaciente(p) {
    editandoPac = p || null;
    $("d-pac-tit").textContent = p ? "Editar paciente" : "Carga manual";
    $("pac-ap").value = p ? p.apellido : "";
    $("pac-no").value = p ? p.nombre : "";
    $("pac-dni").value = p ? p.dni : "";
    $("pac-err").textContent = "";
    abrirDlg("d-pac");
    if (!p) setTimeout(() => $("pac-ap").focus(), 50);
  }
  $("f-pac").addEventListener("submit", (e) => {
    e.preventDefault();
    const ap = DNI.limpiarTexto($("pac-ap").value);
    const no = DNI.limpiarTexto($("pac-no").value);
    const dni = DNI.soloDigitos($("pac-dni").value);
    const err = $("pac-err");
    if (!ap || !no) { err.textContent = "Completá apellido y nombre."; return; }
    if (!DNI.dniValido(dni)) { err.textContent = "El DNI tiene que tener 7 u 8 números."; return; }
    const o = op();
    const otro = o.pacientes.find((x) => x.dni === dni && x !== editandoPac);
    if (otro) { err.textContent = "Ese DNI ya está cargado: " + an(otro); return; }
    cerrarDlg("d-pac");
    if (editandoPac) {
      editandoPac.apellido = ap; editandoPac.nombre = no; editandoPac.dni = dni;
      guardar();
    } else {
      agregarPaciente({ apellido: ap, nombre: no, dni }, "manual");
    }
    renderOp();
  });

  // ---------- Sonido / vibración ----------
  let audio = null;
  function prepararAudio() {
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (e) {}
  }
  function beep(tipo) {
    if (navigator.vibrate) navigator.vibrate(tipo === "ok" ? 80 : [60, 60, 60]);
    if (!audio) return;
    try {
      const notas = tipo === "ok" ? [1200] : [500, 500];
      notas.forEach((f, i) => {
        const osc = audio.createOscillator(), g = audio.createGain();
        osc.frequency.value = f; osc.type = "sine";
        const t0 = audio.currentTime + i * 0.16;
        g.gain.setValueAtTime(0.25, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.13);
        osc.connect(g); g.connect(audio.destination); osc.start(t0); osc.stop(t0 + 0.14);
      });
    } catch (e) {}
  }

  // ---------- Lector ZXing ----------
  // Si falta la librería, el resto de la app sigue funcionando (carga manual, exportar).
  const hayLector = typeof ZXingWASM !== "undefined";
  if (hayLector) {
    try {
      ZXingWASM.prepareZXingModule({
        overrides: {
          locateFile: (path, prefix) => (path.endsWith(".wasm") ? "zxing_reader.wasm" : prefix + path),
        },
        fireImmediately: true,
      }).catch((e) => window.mostrarDiag && window.mostrarDiag("No cargó el lector (zxing_reader.wasm): " + (e && e.message)));
    } catch (e) {}
  }
  function lectorDisponible() {
    if (hayLector) return true;
    toast("Falta el archivo zxing-reader.js. Usá carga manual.");
    return false;
  }

  // PDF417 = código de barras del DNI tarjeta anterior. QRCode = DNI nuevo.
  const OPC_VIDEO = { formats: ["PDF417", "QRCode"], tryHarder: true, tryRotate: true, tryInvert: false, maxNumberOfSymbols: 1 };
  const OPC_FOTO = { formats: ["PDF417", "QRCode"], tryHarder: true, tryRotate: true, tryInvert: true, tryDownscale: true, maxNumberOfSymbols: 1 };

  // Último código leído que la app no supo interpretar (solo en memoria, no se guarda).
  // Sirve para copiarlo y poder ajustar el lector a un formato nuevo.
  let ultimaRara = null;
  function actualizarBtnRara() { $("b-copiar-rara").classList.toggle("oculto", !ultimaRara); }
  async function copiarRara() {
    if (!ultimaRara) return;
    const t = ultimaRara.raw;
    let ok = false;
    try { await navigator.clipboard.writeText(t); ok = true; } catch (e) {}
    if (!ok) {
      try {
        const ta = document.createElement("textarea");
        ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select(); ok = document.execCommand("copy"); ta.remove();
      } catch (e) {}
    }
    toast(ok ? "Texto copiado (" + t.length + " caracteres)." : "No se pudo copiar.", 2500);
  }

  // Procesa el texto leído de un código. Devuelve el resultado para mostrar.
  function procesarTexto(raw, origen) {
    let txt = raw;
    // Lectores externos con distinto idioma de teclado pueden mandar " en vez de @
    if (txt.indexOf("@") === -1 && txt.indexOf("{") === -1 && txt.indexOf('"') !== -1) txt = txt.replace(/"/g, "@");
    const a = DNI.analizar(txt);
    if (!a.ok) {
      ultimaRara = { raw: raw, tipo: a.tipo, detalle: a.detalle, largo: a.largo };
      actualizarBtnRara();
      return { estado: "error", info: ultimaRara };
    }
    const r = agregarPaciente(a.datos, origen);
    renderOp();
    return r;
  }

  // ---------- Escáner con cámara ----------
  let stream = null, corriendo = false, ultimoRaw = "", ultimoT = 0;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  function aviso(clase, l1, l2) {
    const a = $("aviso");
    a.className = clase || "";
    a.querySelector(".l1").textContent = l1;
    a.querySelector(".l2").textContent = l2 || "";
    $("marco").className = "marco" + (clase ? " " + clase : "");
    $("b-copiar-esc").classList.add("oculto");
  }

  async function abrirEscaner() {
    prepararAudio();
    if (!lectorDisponible()) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast("Este navegador no permite usar la cámara. Usá 'Sacar foto del DNI'.");
      return;
    }
    const t = document.querySelector(".toast");
    if (t) t.remove();
    $("escaner").classList.remove("oculto");
    aviso("", "Abriendo cámara…", "");
    const ok = await iniciarCamara(leerPref("lba_cam"));
    if (!ok) {
      cerrarEscaner();
      toast("No se pudo abrir la cámara. Revisá los permisos o usá 'Sacar foto del DNI'.");
      return;
    }
    corriendo = true;
    bucle();
  }

  // ----- Cámara: elección, zoom, linterna y enfoque (pensado para Android) -----
  const esAndroid = /Android/i.test(navigator.userAgent);
  let camaras = [], track = null, cap = {}, linterna = false;

  function leerPref(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardarPref(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  async function iniciarCamara(deviceId) {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    const base = { width: { ideal: 1920 }, height: { ideal: 1080 } };
    const intentos = [];
    if (deviceId) intentos.push({ ...base, deviceId: { exact: deviceId } });
    intentos.push({ ...base, facingMode: { ideal: "environment" } });
    stream = null;
    for (const video of intentos) {
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: false, video }); break; }
      catch (e) {}
    }
    if (!stream) return false;
    track = stream.getVideoTracks()[0];

    // Lista de cámaras traseras (los nombres aparecen recién después de dar permiso)
    try {
      const todas = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
      const traseras = todas.filter((d) => !/front|frontal|user|delantera|selfie/i.test(d.label));
      camaras = traseras.length ? traseras : todas;
    } catch (e) { camaras = []; }

    const v = $("video");
    v.srcObject = stream;
    await v.play().catch(() => {});
    await configurarControles();
    return true;
  }

  async function configurarControles() {
    cap = {};
    try { cap = track.getCapabilities ? track.getCapabilities() : {}; } catch (e) {}
    linterna = false;

    try {
      if (cap.focusMode && cap.focusMode.includes("continuous")) {
        await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
      }
    } catch (e) {}

    // Zoom: permite alejar el celu (donde sí enfoca) y que el código se vea grande igual
    const cont = $("zoom-btns");
    cont.innerHTML = "";
    const maxZ = cap.zoom ? Math.min(cap.zoom.max || 1, 4) : 1;
    if (maxZ >= 1.5) {
      const niveles = [1, 1.5, 2, 3, 4].filter((z) => z <= maxZ + 0.01 && z >= (cap.zoom.min || 1));
      niveles.forEach((z) => {
        const b = document.createElement("button");
        b.className = "ctl"; b.textContent = z + "x"; b.dataset.z = z;
        b.onclick = () => ponerZoom(z, true);
        cont.appendChild(b);
      });
      const guardado = parseFloat(leerPref("lba_zoom"));
      const inicial = guardado && guardado <= maxZ ? guardado : (esAndroid ? Math.min(2, maxZ) : 1);
      await ponerZoom(inicial, false);
    }
    $("b-linterna").classList.toggle("oculto", !cap.torch);
    $("b-linterna").classList.remove("activo");
    $("b-camara").classList.toggle("oculto", camaras.length < 2);
    $("controles").classList.toggle("oculto", maxZ < 1.5 && !cap.torch && camaras.length < 2);

    const conZoom = maxZ >= 1.5 && parseFloat(leerPref("lba_zoom") || (esAndroid ? 2 : 1)) > 1;
    aviso("", "Buscando código…", conZoom
      ? "Alejá el celu (unos 20 a 25 cm) hasta que el código se vea nítido. Tocá la imagen para enfocar."
      : "Acercá el DNI hasta que el código llene el recuadro. Tocá la imagen para enfocar.");
  }

  async function ponerZoom(z, elegidoPorUsuario) {
    try { await track.applyConstraints({ advanced: [{ zoom: z }] }); } catch (e) { return; }
    document.querySelectorAll("#zoom-btns .ctl").forEach((b) => b.classList.toggle("activo", parseFloat(b.dataset.z) === z));
    if (elegidoPorUsuario) guardarPref("lba_zoom", String(z));
  }

  $("b-linterna").onclick = async () => {
    linterna = !linterna;
    try { await track.applyConstraints({ advanced: [{ torch: linterna }] }); } catch (e) { linterna = false; }
    $("b-linterna").classList.toggle("activo", linterna);
  };

  $("b-camara").onclick = async () => {
    if (camaras.length < 2) return;
    const actual = track && track.getSettings ? track.getSettings().deviceId : null;
    let i = camaras.findIndex((c) => c.deviceId === actual);
    const sig = camaras[(i + 1) % camaras.length];
    aviso("", "Cambiando de cámara…", "");
    const ok = await iniciarCamara(sig.deviceId);
    if (ok) {
      const usada = track.getSettings ? track.getSettings().deviceId : sig.deviceId;
      guardarPref("lba_cam", usada);
      const n = camaras.findIndex((c) => c.deviceId === usada) + 1;
      toast("Cámara " + (n || "?") + " de " + camaras.length + ". Probá cuál enfoca mejor.", 2500);
    }
  };

  // Tocar la imagen para enfocar (funciona en los Android que lo permiten)
  $("video").addEventListener("click", async (e) => {
    if (!track) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    const anillo = $("anillo");
    anillo.style.left = e.clientX - 30 + "px"; anillo.style.top = e.clientY - 30 + "px";
    anillo.classList.remove("oculto");
    setTimeout(() => anillo.classList.add("oculto"), 700);
    try {
      await track.applyConstraints({ advanced: [{ pointsOfInterest: [{ x, y }], focusMode: "single-shot" }] });
      setTimeout(() => {
        track && track.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(() => {});
      }, 1500);
    } catch (err) {}
  });

  function cerrarEscaner() {
    corriendo = false;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null; track = null;
    $("video").srcObject = null;
    $("escaner").classList.add("oculto");
  }

  // Recorta una franja horizontal alrededor del recuadro, con todo el ancho del video
  // (así lee aunque el código se salga un poco de los costados).
  function recorte(v) {
    const vw = v.videoWidth, vh = v.videoHeight;
    const sw = v.clientWidth, sh = v.clientHeight;
    const esc = Math.max(sw / vw, sh / vh);
    const offY = (sh - vh * esc) / 2;
    const m = $("marco").getBoundingClientRect();
    let y = (m.top - m.height * 0.5 - offY) / esc;
    let h = (m.height * 2) / esc;
    y = Math.max(0, y); h = Math.min(vh - y, h);
    return { x: 0, y, w: vw, h };
  }

  async function bucle() {
    if (!corriendo) return;
    const v = $("video");
    if (v.readyState >= 2 && v.videoWidth) {
      try {
        const r = recorte(v);
        canvas.width = Math.round(r.w); canvas.height = Math.round(r.h);
        ctx.drawImage(v, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const res = await ZXingWASM.readBarcodes(img, OPC_VIDEO);
        const ok = res.find((x) => x.isValid && x.text);
        if (ok) manejarLectura(ok.text);
      } catch (e) {}
    }
    if (corriendo) setTimeout(() => requestAnimationFrame(bucle), 40);
  }

  function manejarLectura(texto) {
    const ahora = Date.now();
    // Mientras el mismo código siga a la vista no se procesa de nuevo (ni suena otra vez).
    // Si se aparta más de 2 segundos y se vuelve a mostrar, avisa "ya estaba cargado".
    const mismo = texto === ultimoRaw && ahora - ultimoT < 2000;
    ultimoRaw = texto; ultimoT = ahora;
    if (mismo) return;
    const r = procesarTexto(texto, "escaneo");
    mostrarResultado(r);
  }

  function mostrarResultado(r) {
    if (r.estado === "ok") {
      beep("ok");
      aviso("ok", an(r.p), "DNI " + Number(r.p.dni).toLocaleString("es-AR") + " · Paciente #" + op().pacientes.length);
    } else if (r.estado === "repetido") {
      beep("rep");
      aviso("rep", "Ya estaba cargado", an(r.p) + " · DNI " + Number(r.p.dni).toLocaleString("es-AR"));
    } else {
      beep("rep");
      const i = r.info || {};
      let l1 = "No pude leer los datos", l2 = "Probá de nuevo o usá carga manual";
      if (i.tipo === "url") { l1 = "El QR es un enlace"; l2 = "No trae los datos del DNI (" + i.detalle + "). Usá carga manual."; }
      else if (i.tipo === "desconocido") { l2 = "Leí un código, pero con un formato que la app no reconoce. Usá carga manual o tocá 'Copiar lectura'."; }
      aviso("err", l1, l2);
      $("b-copiar-esc").classList.toggle("oculto", !ultimaRara);
    }
  }

  // ---------- Foto del DNI (respaldo) ----------
  $("b-foto").onclick = () => { prepararAudio(); if (lectorDisponible()) $("in-foto").click(); };
  $("in-foto").addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    toast("Leyendo foto…", 1500);
    try {
      const res = await ZXingWASM.readBarcodes(f, OPC_FOTO);
      const ok = res.find((x) => x.isValid && x.text);
      if (!ok) { toast("No se encontró el código. Sacá la foto más de cerca y con buena luz."); return; }
      const r = procesarTexto(ok.text, "foto");
      if (r.estado === "ok") { beep("ok"); toast("✓ " + an(r.p)); }
      else if (r.estado === "repetido") { beep("rep"); toast("Ya estaba cargado: " + an(r.p)); }
      else if (r.info && r.info.tipo === "url") toast("El QR es un enlace y no trae los datos. Usá carga manual.", 5000);
      else toast("Leí el código pero no reconozco el formato. Usá carga manual o 'Copiar última lectura no reconocida'.", 5000);
    } catch (err) {
      toast("No se pudo leer la foto.");
    }
  });

  // ---------- Lector externo (Bluetooth/USB, modo teclado) ----------
  $("in-lector").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const txt = e.target.value;
    e.target.value = "";
    if (!txt.trim()) return;
    prepararAudio();
    const r = procesarTexto(txt, "escaneo");
    if (r.estado === "ok") { beep("ok"); toast("✓ " + an(r.p), 1500); }
    else if (r.estado === "repetido") { beep("rep"); toast("Ya estaba cargado: " + an(r.p)); }
    else { beep("rep"); toast("Lectura inválida. Escaneá de nuevo."); }
  });

  // ---------- Exportar Excel ----------
  function nombreArchivo(o) {
    const limpio = o.nombre.normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 50);
    return "Operativo_" + limpio + "_" + o.fecha + ".xlsx";
  }

  async function exportar() {
    const o = op();
    if (!o.pacientes.length) { toast("No hay pacientes para exportar."); return; }
    if (typeof XLSX === "undefined") { toast("Falta xlsx.mini.min.js, no se puede armar el Excel."); return; }
    const filas = [["APELLIDO Y NOMBRE", "DNI"]].concat(o.pacientes.map((p) => [an(p), Number(p.dni)]));
    const ws = XLSX.utils.aoa_to_sheet(filas);
    ws["!cols"] = [{ wch: 42 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pacientes");
    const datos = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const tipo = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const nombre = nombreArchivo(o);
    const archivo = new File([datos], nombre, { type: tipo });

    let compartido = false;
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: nombre });
        compartido = true;
      } catch (e) {
        if (e && e.name === "AbortError") return;
      }
    }
    if (!compartido) {
      const url = URL.createObjectURL(archivo);
      const a = document.createElement("a");
      a.href = url; a.download = nombre;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
    o.exportado = new Date().toISOString();
    guardar();
  }

  // ---------- Toast ----------
  let toastT = null;
  function toast(msg, ms) {
    let t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    clearTimeout(toastT);
    toastT = setTimeout(() => t.remove(), ms || 3000);
  }

  // ---------- Eventos ----------
  $("b-nuevo-op").onclick = () => abrirDialogoOp(null);
  $("b-volver").onclick = () => { opActual = null; $("in-buscar").value = ""; renderInicio(); mostrar("inicio"); };
  $("b-escanear").onclick = abrirEscaner;
  $("b-cerrar-esc").onclick = cerrarEscaner;
  $("b-copiar-esc").onclick = copiarRara;
  $("b-copiar-rara").onclick = copiarRara;
  $("b-manual").onclick = () => abrirDialogoPaciente(null);
  $("b-exportar").onclick = exportar;
  $("b-renombrar").onclick = () => abrirDialogoOp(op());
  $("in-buscar").addEventListener("input", renderOp);
  $("b-borrar-op").onclick = () => {
    const o = op();
    const aviso = o.exportado ? "" : "\n\nOJO: este operativo todavía NO fue exportado.";
    if (!confirm("¿Borrar el operativo \"" + o.nombre + "\" con " + o.pacientes.length + " pacientes?" + aviso)) return;
    ops = ops.filter((x) => x.id !== o.id);
    guardar();
    $("b-volver").click();
  };
  document.addEventListener("visibilitychange", () => { if (document.hidden && corriendo) cerrarEscaner(); });

  // ---------- Offline ----------
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then(() => navigator.serviceWorker.ready).then(() => {
      $("pie-estado").textContent = "Lista para usar sin internet";
    }).catch(() => {
      $("pie-estado").textContent = "Modo sin internet no disponible en este navegador";
    });
  }

  renderInicio();
  window.__appOk = true;
  const aviso0 = document.getElementById("sin-js");
  if (aviso0) aviso0.remove();
})();
