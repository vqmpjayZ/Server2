const express = require('express');
const crypto = require('crypto');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Store tokens temporarily
const tokens = {};

// Add CORS middleware
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

// Serve static files
app.use(express.static('.'));

// Direct API route (for testing)
app.get('/', (req, res) => {
    const hwid = req.query.hwid;
    
    if (!hwid) {
        return res.status(400).json({ error: 'HWID required' });
    }
    
    const key = generateKey(hwid);
    const nextSunday = getNextSunday();
    
    res.json({
        key: key,
        expires: Math.floor(nextSunday.getTime() / 1000),
        week: getCurrentWeek(),
        hwid: hwid
    });
});

// Workink destination route
app.get('/generate', (req, res) => {
    const token = crypto.randomBytes(16).toString('hex');
    const hwid = req.query.hwid || "default_user";
    
    console.log("=== GENERATE ROUTE DEBUG ===");
    console.log("HWID from URL:", hwid);
    console.log("Token created:", token);
    console.log("===============================");
    
    tokens[token] = {
        hwid: hwid,
        expires: Date.now() + 300000 // 5 minutes
    };
    
    res.redirect(`/key.html?token=${token}`);
});

// Get key with token (called by key.html)
app.get('/getkey', (req, res) => {
    const token = req.query.token;
    const tokenData = tokens[token];
    
    console.log("=== GETKEY ROUTE DEBUG ===");
    console.log("Token:", token);
    console.log("Token data:", tokenData);
    
    if (!tokenData || Date.now() > tokenData.expires) {
        console.log("Token invalid or expired");
        return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    const key = generateKey(tokenData.hwid);
    delete tokens[token];
    
    console.log("Key generated for HWID:", tokenData.hwid);
    console.log("=============================");
    
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
    
    console.log("=== KEY GENERATION DEBUG ===");
    console.log("HWID:", hwid);
    console.log("Week:", week);
    console.log("Secret:", secret);
    console.log("Combined:", combined);
    
    const key = crypto.createHash('md5')
        .update(combined)
        .digest('hex')
        .substring(0, 12);
    
    console.log("Final Key:", key);
    console.log("============================");
    
    return key;
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
