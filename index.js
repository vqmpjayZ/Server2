require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const schedule = require('node-schedule');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// --- In-memory "Database" (for demonstration purposes) ---
const keysDB = new Map()
const WORKINK_BASE_URL = process.env.WORKINK_BASE_URL || 'https://workink.net/20yd/opie4iqd';
const SERVER_BASE_URL = process.env.SERVER_BASE_URL || 'https://server2-78hd.onrender.com';

function generateRandomKey(length = 16) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function getNextWeekStartTime() {
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + (7 - now.getDay()) % 7);
    nextWeek.setHours(0, 0, 0, 0);
    return Math.floor(nextWeek.getTime() / 1000);
}

// --- API Endpoints ---
// 1. Endpoint to generate the Work.ink link (called by Roblox script)
app.get('/generate-link', (req, res) => {
    const { hwid } = req.query;

    if (!hwid) {
        return res.status(400).json({ error: 'HWID is required.' });
    }

    const keyId = uuidv4();
    const secretKey = generateRandomKey(24);

    const expiresAt = getNextWeekStartTime();
    keysDB.set(keyId, {
        hwid: hwid,
        secretKey: secretKey,
        status: 'pending', // 'pending', 'completed', 'expired'
        expiresAt: expiresAt,
        createdAt: Date.now()
    });

    console.log(`Generated keyId: ${keyId} for HWID: ${hwid}. Expires: ${new Date(expiresAt * 1000).toLocaleString()}`);

    // Construct the Work.ink URL with your server's callback
    // THIS IS CRUCIAL: Replace WORKINK_BASE_URL with your actual Work.ink monetization link
    // and ensure Work.ink allows you to set a custom destination/callback URL.
    // Example: https://work.ink/YOUR_WORK_INK_ID?destination=https://your-server.com/workink-callback?token={keyId}
    const workinkUrl = `${WORKINK_BASE_URL}?destination=${encodeURIComponent(`${SERVER_BASE_URL}/workink-callback?token=${keyId}`)}`;

    res.json({ success: true, link: workinkUrl, keyId: keyId });
});

// 2. Work.ink Callback Endpoint (called by Work.ink after completion)
app.get('/workink-callback', (req, res) => {
    const { token } = req.query;

    if (!token) {
        console.warn('Work.ink callback: Missing token.');
        return res.status(400).send('Missing token in callback.');
    }

    const keyEntry = keysDB.get(token);

    if (keyEntry) {
        if (keyEntry.status === 'pending') {
            keyEntry.status = 'completed';
            keysDB.set(token, keyEntry);
            console.log(`Key ${token} for HWID ${keyEntry.hwid} marked as completed by Work.ink callback.`);
            res.redirect(`/key.html?token=${token}`);
        } else {
            console.log(`Key ${token} already processed or expired. Status: ${keyEntry.status}`);
            res.redirect(`/key.html?token=${token}&error=already_processed`);
        }
    } else {
        console.warn(`Work.ink callback: Key entry not found for token: ${token}`);
        res.redirect(`/key.html?token=${token}&error=key_not_found`);
    }
});

app.get('/getkey', (req, res) => {
    const { token, hwid } = req.query;

    if (!token || !hwid) {
        console.warn(`Missing token or HWID in /getkey request. Token: ${token}, HWID: ${hwid}`);
        return res.status(400).json({ error: 'Token and HWID are required.' });
    }

    const keyEntry = keysDB.get(token);

    if (!keyEntry) {
        console.log(`Key entry not found for token: ${token}`);
        return res.status(404).json({ error: 'Invalid or expired key token. Please get a new key.' });
    }

    if (keyEntry.hwid !== hwid) {
        console.warn(`HWID mismatch for token ${token}. Expected: ${keyEntry.hwid}, Received: ${hwid}`);
        return res.status(403).json({ error: 'HWID mismatch. Please get a new key using your device.' });
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (keyEntry.status !== 'completed' || currentTime >= keyEntry.expiresAt) {
        let errorMessage = 'Key not yet acquired or has expired. Please complete the key process again.';
        if (currentTime >= keyEntry.expiresAt) {
            keyEntry.status = 'expired';
            keysDB.set(token, keyEntry);
            errorMessage = 'Your key has expired. Please get a new one.';
        } else if (keyEntry.status === 'pending') {
             errorMessage = 'Key not yet acquired. Please complete the Work.ink steps.';
        }
        console.log(`Key ${token} status or expiration issue. Status: ${keyEntry.status}, Expires: ${new Date(keyEntry.expiresAt * 1000).toLocaleString()}`);
        return res.status(403).json({ error: errorMessage });
    }

    const weekNumber = Math.floor(keyEntry.expiresAt / (7 * 24 * 60 * 60));
    res.json({
        key: keyEntry.secretKey,
        hwid: keyEntry.hwid,
        week: weekNumber,
        expires: keyEntry.expiresAt,
        success: true
    });
});

// --- Scheduled Key Expiration/Rotation ---
schedule.scheduleJob('0 0 * * 1', () => {
    console.log('Running weekly key expiration job...');
    const currentTime = Math.floor(Date.now() / 1000);
    let expiredCount = 0;

    for (const [keyId, keyEntry] of keysDB.entries()) {
        if (currentTime >= keyEntry.expiresAt) {
            keysDB.delete(keyId);
            expiredCount++;
        }
    }
    console.log(`Cleaned up ${expiredCount} expired keys.`);
});

app.listen(port, () => {
    console.log(`Server listening at ${SERVER_BASE_URL}`);
    console.log(`Work.ink Base URL: ${WORKINK_BASE_URL}`);
    console.log('Reminder: Replace the in-memory keysDB with a proper database for production!');
});
