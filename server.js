const express = require("express");
const app = express();
const fs = require("fs");
const cors = require("cors");

app.use(cors());
app.use(express.json());

const KEYS_FILE = "keys.json";

function loadKeys() {
    if (!fs.existsSync(KEYS_FILE)) fs.writeFileSync(KEYS_FILE, "[]");
    return JSON.parse(fs.readFileSync(KEYS_FILE));
}

function saveKeys(keys) {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
}

function generateKey() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let key = "";
    for (let i = 0; i < 16; i++) key += chars[Math.floor(Math.random() * chars.length)];
    return key;
}

app.get("/getkey/:userid", (req, res) => {
    const secret = req.query.token;
    if (secret !== "MY_SECRET_TOKEN_123") {
        return res.status(403).json({ error: "Unauthorized" });
    }

    const userId = req.params.userid;
    const keys = loadKeys();

    const existing = keys.find(k => k.userId === userId);
    if (existing) return res.json({ key: existing.key });

    const newKey = generateKey();
    keys.push({ userId, key: newKey });
    saveKeys(keys);
    res.json({ key: newKey });
});

app.get("/validate/:key", (req, res) => {
    const key = req.params.key;
    const keys = loadKeys();
    const isValid = keys.find(k => k.key === key);
    res.json({ valid: !!isValid });
});

app.listen(3000, () => console.log("Server running on port 3000"));
