const express = require('express');
const crypto = require('crypto');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

const tokens = {};

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.static('.'));

app.get('/', (req, res) => {
    const hwid = req.query.hwid;

    if (!hwid) {
        return res.status(400).json({ error: 'HWID required' });
    }

    const key = generateKey(hwid);

    res.json({
        key: key,
        expires: Math.floor(getNextSunday().getTime() / 1000),
        week: getCurrentWeek(),
        hwid: hwid
    });
});

app.get('/generate', (req, res) => {
    const token = crypto.randomBytes(16).toString('hex');
    const hwid = req.query.hwid;

    tokens[token] = {
        expires: Date.now() + 300000,
        hwid: hwid || null
    };

    let url = `/key.html?token=${token}`;
    if (hwid) url += `&hwid=${hwid}`;

    if (req.query.json === "1") {
        return res.json({ token, hwid });
    }

    res.redirect(url);
});

app.get('/sethwid', (req, res) => {
    const token = req.query.token;
    const hwid = req.query.hwid;

    if (!token || !hwid || !tokens[token]) {
        return res.status(400).json({ error: 'Invalid token or hwid' });
    }

    tokens[token].hwid = hwid;
    res.json({ success: true });
});

app.get('/getkey', (req, res) => {
    const token = req.query.token;
    const tokenData = tokens[token];

    if (!token || !tokenData || Date.now() > tokenData.expires) {
        return res.status(400).json({ error: 'Invalid or expired token' });
    }

    if (!tokenData.hwid) {
        return res.status(400).json({ error: 'HWID not set for token' });
    }

    const key = generateKey(tokenData.hwid);
    delete tokens[token];

    res.json({
        key: key,
        hwid: tokenData.hwid,
        expires: Math.floor(getNextSunday().getTime() / 1000),
        week: getCurrentWeek()
    });
});

function generateKey(hwid) {
    const week = getCurrentWeek();
    const secret = "vadrifts_";
    const combined = hwid + week + secret;

    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        hash = ((hash * 31) + combined.charCodeAt(i)) % 2147483647;
    }

    return hash.toString(16).substring(0, 12);
}

function getCurrentWeek() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return week + '-' + now.getFullYear();
}

function getNextSunday() {
    const now = new Date();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay()));
    nextSunday.setHours(23, 59, 59, 999);
    return nextSunday;
}

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
