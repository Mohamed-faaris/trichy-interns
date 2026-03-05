const express = require('express');
const { 
  default: makeWASocket, 
  DisconnectReason, 
  useMultiFileAuthState 
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

const app = express();
const PORT = 4003;

const ADMIN_PHONE = '919345609576';

app.use(express.json());
app.use(express.static('public'));

let sock = null;
let qrCode = null;
let isReady = false;

// Ensure auth directory exists
const authDir = './baileys_auth';
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

// Initialize Baileys connection
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  
  sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    browser: ['Baileys Form', 'Chrome', '1.0.0']
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      qrCode = qr;
      console.log('\n📱 Scan this QR code with your WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    }
    
    if (connection === 'close') {
      isReady = false;
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('⚠️ Connection closed due to:', lastDisconnect?.error, ', reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      isReady = true;
      console.log('\n✅ Baileys is ready!');
      console.log(\`🚀 Server running on http://localhost:\${PORT}\`);
      console.log(\`📨 Messages will be sent to: +\${ADMIN_PHONE}\n\`);
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

// Initialize
connectToWhatsApp().catch(console.error);

// Helper function to send message
async function sendMessage(to, message) {
  if (!sock || !isReady) {
    throw new Error('WhatsApp not connected');
  }
  
  const jid = \`\${to}@s.whatsapp.net\`;
  await sock.sendMessage(jid, { text: message });
}

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    ready: isReady,
    timestamp: new Date().toISOString()
  });
});

// POST endpoint to receive form data and send WhatsApp message
app.post('/send-message', async (req, res) => {
  try {
    if (!isReady) {
      return res.status(503).json({
        error: 'WhatsApp client not ready yet. Please scan QR code first.'
      });
    }

    const { name, number, message } = req.body;

    if (!name || !number || !message) {
      return res.status(400).json({
        error: 'All fields are required: name, number, message'
      });
    }

    const formattedMessage = \`📋 *New Form Submission*

👤 *Name:* \${name}
📞 *Phone:* \${number}
💬 *Message:*
\${message}

_Sent via Baileys form_\`;

    // Send message to admin
    await sendMessage(ADMIN_PHONE, formattedMessage);

    console.log(\`\n✅ Message sent to admin (+\${ADMIN_PHONE})\`);
    console.log(\`   From: \${name} (\${number})\`);

    res.json({
      success: true,
      message: 'WhatsApp message sent successfully!'
    });

  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({
      error: 'Failed to send WhatsApp message',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    whatsappReady: isReady
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🟢 Starting Baileys project...');
  console.log(\`📡 Server listening on port \${PORT}\`);
  console.log('⏳ Waiting for WhatsApp authentication...\n');
});
