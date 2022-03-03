const mongoose = require("mongoose");
const Vacantes = mongoose.model("Vacantes");
// const Vacante = require("../models/Vacantes");

exports.mostrarTrabajos = async (req, res, next) => {
  const vacantes = await Vacantes.find();

  if (!vacantes) return next();

  res.render("home", {
    nombrePagina: "devJobs",
    tagLine: "Encuentra y Publica Trabajos para Desarrolladroes Web",
    barra: true,
    boton: true,
    propuestas: vacantes
  });
};
