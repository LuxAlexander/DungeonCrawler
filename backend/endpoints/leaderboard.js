const express = require("express");
const Routes = express.Router();

// MongoDB connection
const dbo = require("../db/conn");

// -------------------------------
// GET TOP 10 SCORES
// -------------------------------
Routes.route("/api/leaderboard").get(async (req, res) => {
  try {
    const db = dbo.getDb();

    const scores = await db
      .collection("Scores")
      .find({})
      .sort({ score: -1 }) // descending
      .limit(10)
      .toArray();

    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------
// SUBMIT SCORE
// -------------------------------
Routes.route("/api/submit-score").post(async (req, res) => {
  try {
    const db = dbo.getDb();
    const { username, score, gold } = req.body;

    if (score === undefined) {
      return res.status(400).json({ message: "Score is required" });
    }

    const newScore = {
      name: username || "Anonymous",
      score: Number(score),
      gold: Number(gold) || 0,
      createdAt: new Date()
    };

    const result = await db
      .collection("Scores")
      .insertOne(newScore);

    res.status(201).json({
      message: "Score saved!",
      id: result.insertedId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = Routes;
