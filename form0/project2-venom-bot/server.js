const express = require('express');
const venom = require('venom-bot');
const path = require('path');

const app = express();
const PORT = 4002;

const ADMIN_PHONE = '919345609576';

app.use(express.json());
app.use(express.static('public'));

let venomClient = null;

// Initialize Venom Bot
venom
  .create({
    session: 'venom-session',
    headless: true,
    useChrome: false,
    debug: false,
    logQR: true,
    browserArgs: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  .then((client) => {
    venomClient = client;
    console.log('\n✅ Venom Bot is ready!');
    console.log(\`🚀 Server running on http://localhost:\${PORT}\`);
    console.log(\`📨 Messages will be sent to: +\${ADMIN_PHONE}\n\`);

    // Listen for messages (optional - for debugging)
    client.onMessage((message) => {
      console.log(\`📩 Received message from \${message.from}: \${message.body}\`);
    });
  })
  .catch((error) => {
    console.error('❌ Venom Bot initialization failed:', error);
  });

// Status endpoint to check if WhatsApp is ready
app.get('/status', (req, res) => {
  res.json({
    ready: venomClient !== null,
    timestamp: new Date().toISOString()
  });
});

// POST endpoint to receive form data and send WhatsApp message
app.post('/send-message', async (req, res) => {
  try {
    if (!venomClient) {
      return res.status(503).json({
        error: 'WhatsApp client not ready yet. Please try again in a moment.'
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

_Sent via Venom Bot form_\`;

    // Send message to admin using Venom Bot
    await venomClient.sendText(\`\${ADMIN_PHONE}@c.us\`, formattedMessage);

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
    whatsappReady: venomClient !== null
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🟢 Starting Venom Bot project...');
  console.log(\`📡 Server listening on port \${PORT}\`);
  console.log('⏳ Initializing Venom Bot, please wait...\n');
});
