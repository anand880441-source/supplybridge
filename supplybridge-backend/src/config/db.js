const mongoose = require("mongoose");

// Connects the application to MongoDB using the connection string from .env.
const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing. Please check your .env file.");
  }

  await mongoose.connect(mongoUri);

  console.log(
    `MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`
  );
};

module.exports = connectDatabase;
