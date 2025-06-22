const express = require('express');
const crypto = require('crypto');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    const hwid = req.query.hwid;
    
    if (!hwid) {
        return res.status(400).json({ error: 'HWID required' });
    }
    
    const now = new Date();
    const week = getWeekNumber(now) + '-' + now.getFullYear();
    const secret = 'your_secret_salt_change_this';
    
    const key = crypto.createHash('md5')
        .update(hwid + week + secret)
        .digest('hex')
        .substring(0, 12);
    
    const nextSunday = new Date();
    nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()));
    nextSunday.setHours(23, 59, 59, 999);
    
    res.json({
        key: key,
        expires: Math.floor(nextSunday.getTime() / 1000),
        week: week
    });
});

function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
