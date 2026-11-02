// Lectura de los datos del DNI argentino a partir del texto de su código.
//  - DNI tarjeta anterior: código de barras PDF417 con campos separados por "@".
//  - DNI nuevo (policarbonato): código QR. Su formato no está publicado, así que se
//    prueban varias formas (JSON, URL con datos, "@", base64/JWT, clave:valor).
//    Si no se reconoce con seguridad, NO se inventa nada: se devuelve ok:false.
// Funciona en el navegador (window.DNI) y en Node (module.exports) para testear.
(function (root) {
  "use strict";

  // MAYÚSCULAS, sin tildes (como en el DNI), conserva la Ñ, sin espacios dobles.
  function limpiarTexto(s) {
    if (!s) return "";
    return String(s)
      .replace(/Ã‘|Ã±/g, "Ñ")          // UTF-8 leído como Latin-1
      .replace(/�/g, "Ñ")          // carácter inválido: en DNI casi siempre es Ñ
      .toLocaleUpperCase("es-AR")
      .replace(/Ñ/g, "\u0001")          // protege la Ñ
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/\u0001/g, "Ñ")
      .replace(/[^A-ZÑ' \-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function soloDigitos(s) { return String(s || "").replace(/\D/g, ""); }
  function dniValido(d) { return /^\d{7,8}$/.test(d) && Number(d) >= 1000000; }

  function armar(o) {
    if (!o.apellido || !o.nombre || !dniValido(o.dni)) return null;
    o.apellidoNombre = o.apellido + " " + o.nombre;
    return o;
  }

  // ---------- Formato con "@" (PDF417 del DNI tarjeta) ----------
  function desdeArroba(txt) {
    if (txt.indexOf("@") === -1) return null;
    const t = txt.replace(/[\r\n]+/g, "").trim();
    const p = t.split("@").map((x) => x.trim());
    // Viejo (2009-2012): @DNI@EJEMPLAR@?@APELLIDO@NOMBRE@NACIONALIDAD@NACIMIENTO@SEXO@...
    if (t.startsWith("@") && p.length >= 9 && dniValido(soloDigitos(p[1]))) {
      return armar({ dni: soloDigitos(p[1]), apellido: limpiarTexto(p[4]), nombre: limpiarTexto(p[5]),
        nacimiento: p[7] || "", sexo: p[8] || "", formato: "viejo" });
    }
    // Actual: TRAMITE@APELLIDO@NOMBRE@SEXO@DNI@EJEMPLAR@NACIMIENTO@EMISION@...
    if (p.length >= 7 && dniValido(soloDigitos(p[4]))) {
      return armar({ dni: soloDigitos(p[4]), apellido: limpiarTexto(p[1]), nombre: limpiarTexto(p[2]),
        sexo: p[3] || "", nacimiento: p[6] || "", formato: "nuevo" });
    }
    // QR del DNI nuevo (2026): TRAMITE@APELLIDO@NOMBRE@DNI@EJEMPLAR@NACIMIENTO@EMISION@FIRMA(JWT)
    // Se exige que apellido y nombre no tengan números, para no confundirlo con otros textos.
    if (p.length >= 6 && /^\d{8,11}$/.test(p[0]) && dniValido(soloDigitos(p[3])) && !/\d/.test(p[1]) && !/\d/.test(p[2])) {
      return armar({ dni: soloDigitos(p[3]), apellido: limpiarTexto(p[1]), nombre: limpiarTexto(p[2]),
        sexo: "", nacimiento: p[5] || "", formato: "qr-2026" });
    }
    return null;
  }

  // ---------- Objetos clave/valor (JSON, parámetros de URL, líneas "clave: valor") ----------
  function norm(k) {
    return String(k).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  const K_AP = ["apellido", "apellidos", "apellidotitular", "surname", "surnames", "lastname", "familyname", "ape"];
  const K_NO = ["nombre", "nombres", "nombretitular", "givenname", "givennames", "firstname", "firstnames", "name", "names"];
  const K_DNI = ["dni", "numerodni", "nrodni", "documento", "nrodocumento", "numerodocumento", "numdocumento", "nrodoc",
    "documentnumber", "docnumber", "documentno", "idnumber", "numero", "nro"];

  function aplanar(o, out, prof) {
    if (o === null || o === undefined || prof > 4) return;
    if (Array.isArray(o)) { o.forEach((x) => aplanar(x, out, prof + 1)); return; }
    if (typeof o === "object") {
      Object.keys(o).forEach((k) => {
        const v = o[k];
        if (v !== null && typeof v === "object") aplanar(v, out, prof + 1);
        else { const nk = norm(k); if (!(nk in out)) out[nk] = String(v); }
      });
    }
  }

  function desdeObjeto(obj, formato) {
    const m = {};
    aplanar(obj, m, 0);
    function primero(lista) {
      for (let i = 0; i < lista.length; i++) {
        if (lista[i] in m) { const v = limpiarTexto(m[lista[i]]); if (v) return v; }
      }
      return "";
    }
    let dni = "";
    for (let i = 0; i < K_DNI.length && !dni; i++) {
      if (K_DNI[i] in m) { const d = soloDigitos(m[K_DNI[i]]); if (dniValido(d)) dni = d; }
    }
    return armar({
      dni: dni, apellido: primero(K_AP), nombre: primero(K_NO),
      sexo: m.sexo || m.genero || m.sex || "",
      nacimiento: m.fechanacimiento || m.nacimiento || m.birthdate || m.dob || "",
      formato: formato,
    });
  }

  // ---------- Base64 / JWT ----------
  function b64aTexto(s) {
    try {
      let t = s.replace(/-/g, "+").replace(/_/g, "/");
      while (t.length % 4) t += "=";
      const bin = atob(t);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const txt = new TextDecoder("utf-8").decode(bytes);
      let bien = 0;
      for (let i = 0; i < txt.length; i++) { const c = txt.charCodeAt(i); if (c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127) || c > 159) bien++; }
      return txt.length >= 6 && bien / txt.length > 0.95 ? txt : null;
    } catch (e) { return null; }
  }

  // ---------- URL ----------
  function desdeURL(txt, nivel) {
    let u;
    try { u = new URL(txt); } catch (e) { return null; }
    if (!/^https?:$/.test(u.protocol)) return null;
    const m = {};
    u.searchParams.forEach((v, k) => { if (!(k in m)) m[k] = v; });
    if (u.hash && u.hash.indexOf("=") > -1) new URLSearchParams(u.hash.slice(1)).forEach((v, k) => { if (!(k in m)) m[k] = v; });
    let r = desdeObjeto(m, "qr-url");
    if (r) return r;
    // Algún parámetro o tramo de la ruta puede traer los datos en JSON / base64 / JWT
    const cand = Object.keys(m).map((k) => m[k]).concat(u.pathname.split("/").filter(Boolean));
    for (let i = 0; i < cand.length; i++) {
      r = desdeContenido(cand[i], nivel + 1);
      if (r) { r.formato = "qr-url"; return r; }
    }
    return null;
  }

  // ---------- Dispatcher ----------
  function desdeContenido(txt, nivel) {
    if (!txt || nivel > 2) return null;
    const t = String(txt).replace(/^﻿/, "").trim();
    if (!t) return null;
    let r = null;

    // JSON
    if (t[0] === "{" || t[0] === "[") {
      try { r = desdeObjeto(JSON.parse(t), "qr-json"); } catch (e) {}
      if (r) return r;
    }
    // Texto con "@"
    r = desdeArroba(t);
    if (r) { r.formato = nivel ? "qr-" + r.formato : r.formato; return r; }
    // URL
    if (/^https?:\/\//i.test(t)) return desdeURL(t, nivel);
    // JWT: cabecera.datos.firma (la parte del medio trae los datos)
    if (/^[\w-]{6,}\.[\w-]{6,}\.[\w-]*$/.test(t)) {
      const medio = b64aTexto(t.split(".")[1]);
      r = medio && desdeContenido(medio, nivel + 1);
      if (r) { r.formato = "qr-jwt"; return r; }
    }
    // Base64 de algo legible
    if (/^[A-Za-z0-9+/_-]{16,}={0,2}$/.test(t)) {
      const dec = b64aTexto(t);
      r = dec && desdeContenido(dec, nivel + 1);
      if (r) { r.formato = "qr-base64"; return r; }
    }
    // Líneas / pares "clave: valor" o "clave=valor"
    const pares = t.split(/[\r\n|;&]+/).map((x) => x.trim()).filter(Boolean);
    if (pares.length >= 3) {
      const o = {};
      let n = 0;
      pares.forEach((x) => {
        const i = x.search(/[:=]/);
        if (i > 0) { o[x.slice(0, i)] = x.slice(i + 1).trim(); n++; }
      });
      if (n >= 3) { r = desdeObjeto(o, "qr-texto"); if (r) return r; }
    }
    return null;
  }

  // Resultado detallado: { ok:true, datos } o { ok:false, tipo:"url"|"desconocido"|"vacio", detalle, largo }
  function analizar(raw) {
    const txt = String(raw || "").replace(/^﻿/, "").trim();
    if (!txt) return { ok: false, tipo: "vacio", largo: 0 };
    const d = desdeContenido(txt, 0);
    if (d) return { ok: true, datos: d };
    let tipo = "desconocido", detalle = "";
    try { const u = new URL(txt); if (/^https?:$/.test(u.protocol)) { tipo = "url"; detalle = u.host; } } catch (e) {}
    return { ok: false, tipo: tipo, detalle: detalle, largo: txt.length };
  }

  function parsear(raw) { const r = analizar(raw); return r.ok ? r.datos : null; }

  const api = { parsear, analizar, limpiarTexto, soloDigitos, dniValido };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DNI = api;
})(typeof self !== "undefined" ? self : this);
