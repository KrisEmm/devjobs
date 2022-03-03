const mongoose = require("mongoose");

const url_database = `${process.env.DB_DRIVE}://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`

mongoose
  .connect(url_database, { useNewUrlParser: true, useCreateIndex: true })
  .then(res => {
    const { name, host, port } = res.connections[0];
    console.log(`DataBase ${name.toUpperCase()} is Running on ${host}:${port}`);
  })
  .catch(error => console.log(error));

mongoose.connection.on("error", err => {
  console.log(err);
});
mongoose.connection.on("open", () => {
  console.log("DataBase Connected Success");
});

require("../models/Vacantes");
require("../models/Usuarios");
