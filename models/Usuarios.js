const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
const bcrypt = require("bcrypt");

const usuariosSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  nombre: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true,
    trim: true
  },
  token: String,
  expira: Date,
  imagen: String
});

// Método para hashear los passwords
usuariosSchema.pre("save", async function(next) {
  if (!this.isModified("password")) {
    return next();
  }

  const hash = await bcrypt.hash(this.password, 12);
  this.password = hash;
  next();
});
usuariosSchema.post("save", function(error, doc, next) {
  if (error.name === "MongoError" && error.code === 11000) {
    next("Ese correo ya esta registrado");
  } else {
    next("error");
  }
});

usuariosSchema.methods = {
  compararPassword: function(password) {
    return bcrypt.compareSync(password, this.password);
  }
};
module.exports = mongoose.model("Usuarios", usuariosSchema);
