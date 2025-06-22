const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const app = express();

app.use(bodyParser.json());

// Temporary in-memory store (replace with real DB later)
const store = {};

function genWeeklyKey() {
    return crypto.randomBytes(3).toString("hex").toUpperCase();
}

function getWeekStart() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const day = now.getDay();
    now.setDate(now.getDate() - day); // last Sunday
    return now.getTime();
}

app.get("/generate", (req, res) => {
    const hwid = req.query.hwid;
    if (!hwid) return res.status(400).send({ error: "HWID missing" });

    const currentWeek = getWeekStart();

    if (store[hwid] && store[hwid].week === currentWeek) {
        return res.send({ key: store[hwid].key });
    }

    const newKey = genWeeklyKey();
    store[hwid] = {
        key: newKey,
        week: currentWeek
    };

    res.send({ key: newKey });
});

app.post("/validate", (req, res) => {
    const { key, hwid } = req.body;
    const record = store[hwid];

    if (!record) return res.status(401).send({ valid: false });
    if (record.key === key) return res.send({ valid: true });

    res.status(401).send({ valid: false });
});

app.listen(process.env.PORT || 3000, () => {
    console.log("✅ Key server running");
});
