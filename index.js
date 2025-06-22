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
    
    res.json({ key: key });
});
