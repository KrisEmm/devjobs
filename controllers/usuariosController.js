const mongoose = require("mongoose");
const multer = require("multer");
const shortid = require("shortid");
const Usuarios = mongoose.model("Usuarios");
const { body, sanitizeBody, validationResult } = require("express-validator");

const configuracionMulter = {
  limits: { fileSize: 100000 },
  storage: (fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, __dirname + "../../public/uploads/perfiles");
    },
    filename: (req, file, cb) => {
      const extension = file.mimetype.split("/")[1];
      cb(null, `${shortid.generate()}.${extension}`);
    }
  })),
  fileFilter(req, file, cb) {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      cb(null, true);
    } else {
      cb(new Error("Formato NO Valido"), false);
    }
  }
};
const upload = multer(configuracionMulter).single("imagen");

exports.subirImagen = (req, res, next) => {
  upload(req, res, function(error) {
    if (error) {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          req.flash("error", "El archivo es muy grande: Máximo 100kb ");
        } else {
          req.flash("error", error.message);
        }
      } else {
        req.flash("error", error.message);
      }
      res.redirect("/administracion");
      return;
    } else {
      return next();
    }
  });
};

exports.formCrearCuenta = (req, res) => {
  res.render("crear-cuenta", {
    nombrePagina: "Crear tu Cuenta en DevJos",
    tagLine: "Comienza a publicar tus vacantes gratis, solo debes crear una cuenta con nosotros"
  });
};

exports.validarRegistro = [
  // sanitizar
  sanitizeBody("nombre").escape(),
  sanitizeBody("email").escape(),
  sanitizeBody("password").escape(),
  sanitizeBody("confirmar").escape(),
  // validar
  body("nombre", "El Nombre es Obligatorio").notEmpty(),
  body("email", "El E-mail debe ser valido").isEmail(),
  body("password", "El password no puede ir vacio").notEmpty(),
  body("confirmar", "La Confirmacion del password no puede ir vacia").notEmpty(),
  body("confirmar", "El password no es igual a la confirmacion").custom(
    (value, { req }) => value === req.body.password
  )
];

exports.crearUsuario = async (req, res, next) => {
  const nuevoUsuario = req.body;
  const usuario = new Usuarios(nuevoUsuario);

  const errores = validationResult(req).array();

  if (errores.length) {
    req.flash(
      "error",
      errores.map(error => error.msg)
    );
    res.render("crear-cuenta", {
      nombrePagina: "Crear tu Cuenta en DevJos",
      tagLine: "Comienza a publicar tus vacantes gratis, solo debes crear una cuenta con nosotros",
      mensajes: req.flash()
    });
  } else {
    try {
      await usuario.save();
      res.redirect("/iniciar-sesion");
    } catch (error) {
      req.flash("error", error);
      res.redirect("/crear-cuenta");
    }
  }
};

exports.formIniciarSesion = async (req, res, next) => {
  res.render("iniciar-sesion", {
    nombrePagina: " Iniciar Sesión DevJobs"
  });
};

exports.formEditarPerfil = async (req, res) => {
  res.render("editar-perfil", {
    nombrePagina: "Edita tu Perfil en DevJobs",
    cerrarSesion: true,
    nombre: req.user.nombre,
    usuario: req.user
  });
};

exports.validarPerfil = [
  // sanitizar
  sanitizeBody("nombre").escape(),
  sanitizeBody("email").escape(),
  sanitizeBody("password").escape(),
  // validar
  body("nombre", "El Nombre es Obligatorio").notEmpty(),
  body("email", "El E-mail es Obligatorio").notEmpty()
];

exports.editarPerfil = async (req, res) => {
  const errores = validationResult(req).array();
  if (errores.length) {
    req.flash(
      "error",
      errores.map(error => error.msg)
    );
    res.render("editar-perfil", {
      nombrePagina: "Edita tu Perfil en DevJobs",
      cerrarSesion: true,
      nombre: req.user.nombre,
      usuario: req.user,
      mensajes: req.flash()
    });
  } else {
    try {
      const { nombre, email, password } = req.body;
      const { _id } = req.user._id;
      const usuario = await Usuarios.findById(_id);
      usuario.nombre = nombre;
      usuario.email = email;
      if (password) {
        usuario.password = password;
      }
      if (req.file) {
        usuario.imagen = req.file.filename;
      }
      await usuario.save();
      req.flash("correcto", "Los cambios se han guardado correctamente");
      res.redirect("/administracion");
    } catch (error) {
      console.log(error);
      req.flash("error", error);
      res.redirect("/editar-perfil");
    }
  }
};
