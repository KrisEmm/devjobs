const mongoose = require("mongoose");
const Vacantes = mongoose.model("Vacantes");
const multer = require("multer");
const shortid = require("shortid");
const { body, sanitizeBody, validationResult } = require("express-validator");

exports.formularioNuevaVacante = (req, res) => {
  res.render("nueva-vacante", {
    nombrePagina: "Nueva Vacante",
    tagLine: "Llena el formulaio y publica tu vacante",
    cerrarSesion: true,
    nombre: req.user.nombre
  });
};

exports.agregarVacante = async (req, res) => {
  const errores = validationResult(req).array();
  if (errores.length) {
    req.flash(
      "error",
      errores.map(error => error.msg)
    );
    res.render("nueva-vacante", {
      nombrePagina: "Nueva Vacante",
      tagLine: "Llena el formulaio y publica tu vacante",
      cerrarSesion: true,
      nombre: req.user.nombre,
      mensajes: req.flash()
    });
  } else {
    try {
      const nuevaVacante = req.body;
      const vacante = new Vacantes(nuevaVacante);
      vacante.autor = req.user._id;
      vacante.skills = req.body.skills.split(",");
      await vacante.save();
      res.redirect(`/vacantes/${vacante.url}`);
    } catch (error) {
      req.flash("error", error);
      res.redirect("/vacantes/nueva");
    }
  }
};

exports.mostrarVacante = async (req, res, next) => {
  const { url } = req.params;
  const vacante = await Vacantes.findOne({ url }).populate("autor");

  if (!vacante) return next();
  let cerrarSesion = false;
  let barra = true;
  let nombre = "";

  if (req.isAuthenticated()) {
    cerrarSesion = true;
    nombre = req.user.nombre;
    barra = false;
  }
  res.render("vacante", {
    tagLine: "Informacion de la vacante:",
    barra: barra,
    vacante,
    nombrePagina: vacante.titulo,
    cerrarSesion: cerrarSesion,
    nombre: nombre
  });
};

exports.formEditarVacante = async (req, res, next) => {
  const { url } = req.params;
  const vacante = await Vacantes.findOne({ url });
  if (!vacante) return next();
  res.render("editarVacante", {
    cerrarSesion: true,
    nombre: req.user.nombre,
    vacante,
    nombrePagina: `Editar- ${vacante.titulo}`
  });
};

exports.editarVacante = async (req, res) => {
  const errores = validationResult(req).array();
  if (errores.length) {
    req.flash(
      "error",
      errores.map(error => error.msg)
    );
    const { url } = req.params;
    const vacante = await Vacantes.findOne({ url });
    if (!vacante) return next();
    res.render("editarVacante", {
      cerrarSesion: true,
      nombre: req.user.nombre,
      vacante,
      nombrePagina: `Editar- ${vacante.titulo}`,
      mensajes: req.flash()
    });
  } else {
    try {
      const { url } = req.params;
      const vacanteActualizada = req.body;
      vacanteActualizada.skills = req.body.skills.split(",");

      const vacante = await Vacantes.findOneAndUpdate({ url }, vacanteActualizada, {
        new: true,
        runValidators: true
      });
      req.flash("correcto", `Vacante ${vacante.url} Actualizada Correctamente.`);
      res.redirect(`/vacantes/${vacante.url}`);
    } catch (error) {
      console.log(error);
      req.flash("error", error);
      res.redirect(`/administrar`);
    }
  }
};

exports.validarVacante = [
  // sanitizar
  sanitizeBody("titulo").escape(),
  sanitizeBody("empresa").escape(),
  sanitizeBody("ubicacion").escape(),
  sanitizeBody("salario").escape(),
  sanitizeBody("contrato").escape(),
  sanitizeBody("skills").escape(),
  // validar
  body("titulo", "El Titulo de la vacante es Obligatorio").notEmpty(),
  body("empresa", "El nombre de la empresa es Obligatorio").notEmpty(),
  body("ubicacion", "La ubicacion es Obligatorio").notEmpty(),
  body("contrato", "Selecciona un Tipo de Contrato").notEmpty(),
  body("skills", "Agrega al menos una habilidad").notEmpty()
];

exports.eliminarVacante = async (req, res) => {
  const { id } = req.params;
  const vacante = await Vacantes.findById(id);

  if (verificarAutor(vacante, req.user)) {
    vacante.remove();
    res.send(
      `Tu haz eliminado la vacante ${vacante.titulo} de la empresa ${vacante.empresa} con id: ${id}`
    );
  } else {
    res.status(403).send("Error");
  }
};

const verificarAutor = (vacante = {}, usuario = {}) => {
  if (!vacante.autor.equals(usuario._id)) {
    return false;
  }
  return true;
};

const configuracionMulter = {
  limits: { fileSize: 200000 },
  storage: (fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, __dirname + "../../public/uploads/cv");
    },
    filename: (req, file, cb) => {
      const extension = file.mimetype.split("/")[1];
      cb(null, `${shortid.generate()}.${extension}`);
    }
  })),
  fileFilter(req, file, cb) {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Formato NO Valido"), false);
    }
  }
};

const upload = multer(configuracionMulter).single("cv");

exports.subirCV = (req, res, next) => {
  upload(req, res, function(error) {
    if (error) {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          req.flash("error", "El archivo es muy grande: Máximo 200kb ");
        } else {
          req.flash("error", error.message);
        }
      } else {
        req.flash("error", error.message);
      }
      res.redirect("back");
      return;
    } else {
      return next();
    }
  });
};

exports.contactar = async (req, res, next) => {
  const { nombre, email } = req.body;
  const cv = req.file.filename;
  const { url } = req.params;
  const vacante = await Vacantes.findOne({ url });
  if (!vacante) return next();

  const nuevoCandidato = {
    nombre,
    email,
    cv
  };

  vacante.candidatos.push(nuevoCandidato);
  await vacante.save();

  req.flash("correcto", "Se envio tu CV correctamente");
  res.redirect("/");
};

exports.mostrarCandidatos = async (req, res, next) => {
  const id = req.params.id;
  const vacante = await Vacantes.findById(id);
  if (vacante.autor != req.user._id.toString()) {
    return next();
  }
  if (!vacante) return next();
  res.render("candidatos", {
    nombrePagina: `Candidatos Vacante - ${vacante.titulo}`,
    cerrarSesion: true,
    nombre: req.user.nombre,
    imagen: req.user.imagen,
    candidatos: vacante.candidatos
  });
};

exports.buscarVacantes = async (req, res) => {
  const query = req.body.q;
  const vacantes = await Vacantes.find({
    $text: {
      $search: query
    }
  });

  res.render("home", {
    nombrePagina: `Resultados para la búsqueda :${req.body.q}`,
    barra: true,
    propuestas: vacantes
  });
};
