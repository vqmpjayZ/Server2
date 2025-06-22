const express = require('express');
const crypto = require('crypto');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

const tokens = {};

app.use(express.static('.'));

app.get('/', (req, res) => {
    const hwid = req.query.hwid;
    
    if (!hwid) {
        return res.status(400).json({ error: 'HWID required' });
    }
    
    const key = generateKey(hwid);
    const nextSunday = new Date();
    nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()));
    nextSunday.setHours(23, 59, 59, 999);
    
    res.json({
        key: key,
        expires: Math.floor(nextSunday.getTime() / 1000),
        week: getWeekNumber(new Date()) + '-' + new Date().getFullYear()
    });
});

app.get('/generate', (req, res) => {
    const token = crypto.randomBytes(16).toString('hex');
    const hwid = req.query.hwid || 'default';
    
    tokens[token] = {
        hwid: hwid,
        expires: Date.now() + 300000
    };
    
    res.redirect(`/key.html?token=${token}`);
});

app.get('/getkey', (req, res) => {
    const token = req.query.token;
    const tokenData = tokens[token];
    
    if (!tokenData || Date.now() > tokenData.expires) {
        return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    const key = generateKey(tokenData.hwid);
    delete tokens[token];
    
    const nextSunday = new Date();
    nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()));
    nextSunday.setHours(23, 59, 59, 999);
    
    res.json({ 
        key: key,
        expires: Math.floor(nextSunday.getTime() / 1000)
    });
});

function generateKey(hwid) {
    const now = new Date();
    const week = getWeekNumber(now) + '-' + now.getFullYear();
    const secret = 'vadrifts_';
    
    return crypto.createHash('md5')
        .update(hwid + week + secret)
        .digest('hex')
        .substring(0, 12);
}

function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
