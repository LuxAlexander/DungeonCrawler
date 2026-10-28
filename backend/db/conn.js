const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.ATLAS_URI);

let dbConnection;

module.exports = {
  connectToServer: async function () {
    try {
      await client.connect();
      dbConnection = client.db(process.env.DB_NAME);
      console.log("MongoDB connected");
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  },

  getDb: function () {
    return dbConnection;
  }
};
