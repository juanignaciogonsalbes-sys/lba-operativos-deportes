// Parser del código PDF417 del DNI argentino.
// Funciona en el navegador (window.DNI) y en Node (module.exports) para testear.
(function (root) {
  "use strict";

  // Limpia un texto: MAYÚSCULAS, sin tildes (como en el DNI), conserva la Ñ,
  // sin espacios dobles, y arregla la Ñ mal decodificada.
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

  function soloDigitos(s) {
    return String(s || "").replace(/\D/g, "");
  }

  function dniValido(d) {
    return /^\d{7,8}$/.test(d) && Number(d) >= 1000000;
  }

  // Devuelve { apellido, nombre, dni, sexo, nacimiento, formato } o null.
  function parsear(raw) {
    if (!raw || raw.indexOf("@") === -1) return null;
    const txt = String(raw).replace(/[\r\n]+/g, "").trim();
    const p = txt.split("@").map((x) => x.trim());

    let r = null;

    // DNI tarjeta viejo (2009-2012): empieza con "@"
    // @DNI@EJEMPLAR@?@APELLIDO@NOMBRE@NACIONALIDAD@NACIMIENTO@SEXO@EMISION@TRAMITE@...
    if (txt.startsWith("@") && p.length >= 9 && dniValido(soloDigitos(p[1]))) {
      r = {
        dni: soloDigitos(p[1]),
        apellido: limpiarTexto(p[4]),
        nombre: limpiarTexto(p[5]),
        nacimiento: p[7] || "",
        sexo: p[8] || "",
        formato: "viejo",
      };
    }
    // DNI tarjeta actual (2012+):
    // TRAMITE@APELLIDO@NOMBRE@SEXO@DNI@EJEMPLAR@NACIMIENTO@EMISION@...
    else if (p.length >= 7 && dniValido(soloDigitos(p[4]))) {
      r = {
        dni: soloDigitos(p[4]),
        apellido: limpiarTexto(p[1]),
        nombre: limpiarTexto(p[2]),
        sexo: p[3] || "",
        nacimiento: p[6] || "",
        formato: "nuevo",
      };
    }

    if (!r || !r.apellido || !r.nombre) return null;
    r.apellidoNombre = r.apellido + " " + r.nombre;
    return r;
  }

  const api = { parsear, limpiarTexto, soloDigitos, dniValido };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DNI = api;
})(typeof self !== "undefined" ? self : this);
