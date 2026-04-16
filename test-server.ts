import express from "express";
const app = express();
app.get("/", (req, res) => res.send("OK"));
app.listen(3001, () => console.log("Test server running on 3001"));
