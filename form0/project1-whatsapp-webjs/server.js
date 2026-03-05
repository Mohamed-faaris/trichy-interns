const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const path = require("path");

const app = express();
const PORT = 4001;

const ADMIN_PHONE = "919345609576";

app.use(express.json());
app.use(express.static("public"));

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: "./.wwebjs_auth",
  }),
  puppeteer: {
    headless: true,
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

client.on("qr", (qr) => {
  console.log("\n📱 Scan this QR code with your WhatsApp:\n");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("\n✅ WhatsApp client is ready!");
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📨 Messages will be sent to: +${ADMIN_PHONE}\n`);
});

client.on("authenticated", () => {
  console.log("🔐 Authenticated successfully!");
});

client.on("auth_failure", (msg) => {
  console.error("❌ Authentication failed:", msg);
});

client.on("disconnected", (reason) => {
  console.log("⚠️ Client disconnected:", reason);
  client.destroy();
  client.initialize();
});

client.initialize();

app.post("/send-message", async (req, res) => {
  try {
    const { name, number, message } = req.body;

    if (!name || !number || !message) {
      return res.status(400).json({
        error: "All fields are required: name, number, message",
      });
    }

    const formattedMessage = `📋 *New Form Submission*

👤 *Name:* ${name}
📞 *Phone:* ${number}
💬 *Message:*
${message}

_Sent via whatsapp-web.js form_`;

    const chatId = `${ADMIN_PHONE}@c.us`;
    await client.sendMessage(chatId, formattedMessage);

    console.log(`\n✅ Message sent to admin (+${ADMIN_PHONE})`);
    console.log(`   From: ${name} (${number})`);

    res.json({
      success: true,
      message: "WhatsApp message sent successfully!",
    });
  } catch (error) {
    console.error("❌ Error sending message:", error);
    res.status(500).json({
      error: "Failed to send WhatsApp message",
      details: error.message,
    });
  }
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    whatsappReady: client.info ? true : false,
  });
});

app.listen(PORT, () => {
  console.log("\n🟢 Starting whatsapp-web.js project...");
  console.log(`📡 Server listening on port ${PORT}`);
  console.log("⏳ Waiting for WhatsApp authentication...\n");
});
