const passport = require("passport");
const mongoose = require("mongoose");
const Vacantes = mongoose.model("Vacantes");
const Usuarios = mongoose.model("Usuarios");
const crypto = require("crypto-random-string");
const enviarEmail = require("../handlers/email");

exports.autenticarUsuario = passport.authenticate("local", {
  successRedirect: "/administracion",
  failureRedirect: "/iniciar-sesion",
  failureFlash: true,
  badRequestMessage: "Ingresa un E-mail y Contraseña"
});

exports.verificarUsuario = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/iniciar-sesion");
};

exports.mostarPanel = async (req, res) => {
  const autor = req.user._id;
  const vacantes = await Vacantes.find({ autor });
  res.render("administracion", {
    nombrePagina: "Panel de Administracion",
    tagLine: "Crea y Administra tus vacantes desde aqui",
    cerrarSesion: true,
    nombre: req.user.nombre,
    imagen: req.user.imagen,
    vacantes
  });
};

exports.cerrarSesion = (req, res) => {
  const mensaje = `Adios, Hasta la proxima ${req.user.nombre}`;
  req.flash("correcto", mensaje);
  req.logout();
  res.redirect("/iniciar-sesion");
};

exports.formRestablecerPassword = (req, res) => {
  res.render("restablecer-password", {
    nombrePagina: "Reestablece tu Password",
    tagLine:
      "Si ya tienes una cuenta pero haz olvidado tu contraseña, coloca tu email para recuperar tu cuenta"
  });
};

exports.enviarToken = async (req, res, next) => {
  const { email } = req.body;
  const usuario = await Usuarios.findOne({ email });
  if (!usuario) {
    req.flash("error", "No existe esa cuenta");
    return res.redirect("back");
  }
  usuario.token = crypto({ length: 20, type: 'url-safe' });
  usuario.expira = Date.now() + 3600000;
  await usuario.save();
  const resetUrl = `http://${req.headers.host}/restablecer-password/${usuario.token}`;
  console.log(process.env.SMTP_ACTIVE)
  if (process.env.SMTP_ACTIVE === "true") {
    await enviarEmail.enviar({
      usuario,
      subject: "Password Reset",
      resetUrl,
      archivo: "reset"
    });
    req.flash("correcto", "Un email ha sido enviado para reestablecer tu contraseña");
    res.redirect("/iniciar-sesion");
    return
  } else {
    res.redirect(`/restablecer-password/${usuario.token}`);
  }

};

exports.restablecerPassword = async (req, res, next) => {
  const { token } = req.params;
  const usuario = await Usuarios.findOne({
    token,
    expira: {
      $gt: Date.now()
    }
  });

  if (!usuario) {
    req.flash("error", "El token no es valido o ya ha expirado, intenta generar uno nuevo");
    return res.redirect("/reestablecer-password");
  }

  res.render("nuevo-password", {
    nombrePagina: "Nuevo Password"
  });
};

exports.guardarPassword = async (req, res) => {
  const { token } = req.params;
  const usuario = await Usuarios.findOne({
    token,
    expira: {
      $gt: Date.now()
    }
  });
  if (!usuario) {
    req.flash("error", "El token no es valido o ya ha expirado, intenta generar uno nuevo");
    return res.redirect("/reestablecer-password");
  }
  usuario.password = req.body.password;
  usuario.token = undefined;
  usuario.expira = undefined;

  await usuario.save();
  req.flash("correcto", "Password modificado correctamente");
  res.redirect("/iniciar-sesion");
};
