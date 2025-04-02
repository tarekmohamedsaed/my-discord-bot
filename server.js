require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const { Strategy } = require("passport-discord");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const path = require("path");
const { Client, GatewayIntentBits } = require("discord.js");
const { QuickDB } = require("quick.db");
const http = require("http");
const WebSocket = require("ws");

const db = new QuickDB();
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// إعداد Passport.js
passport.use(
  new Strategy(
    {
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: process.env.DISCORD_CALLBACK_URL,
      scope: ["identify", "guilds"],
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// إعداد الجلسات
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

// إعدادات CORS
app.use(cors({ origin: process.env.SERVER_URL, credentials: true }));
app.use(express.json());
app.use(express.static("public")); // لدعم الملفات الثابتة (HTML و CSS)

// إعداد Passport.js
app.use(passport.initialize());
app.use(passport.session());

// إضافة المسارات الخاصة بالمصادقة
app.use("/auth", authRoutes);

// صفحة تسجيل الدخول (إما صفحة JSON أو HTML حسب حالة المصادقة)
app.get("/", async (req, res) => {
  if (req.isAuthenticated()) {
    const user = req.user;
    const balance = await db.get(`balance_${user.id}`) || 0;
    const receiveNumber = await db.get(`receive_number_${user.id}`) || 0;
    const sendNumber = await db.get(`send_number_${user.id}`) || 0;
    const taxAmount = await db.get(`tax_amount_${user.id}`) || 0;
    res.json({
      message: "تم تسجيل الدخول بنجاح!",
      status: "success",
      username: user.username,
      receiveNumber: receiveNumber || "غير متوفر",
      sendNumber: sendNumber || "غير متوفر",
      taxAmount: taxAmount || "غير متوفر",
      id: user.id,
      avatar: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`,
      balance: balance,
    });
  } else {
    res.redirect("/login.html");

  }
});

// صفحة الملف الشخصي (يتم عرض البيانات في صفحة HTML)
app.get("/profile", (req, res) => {
  if (req.isAuthenticated()) {
    res.sendFile(path.join(__dirname, "public", "profile.html"));
  } else {
    res.redirect("/login.html");
  }
});

// معالجة المسار الخاص بالـ Discord Callback
app.get("/auth/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/login" }),
  (req, res) => {
    console.log("الـ User بعد المصادقة: ");
    res.redirect("/profile"); // توجيه المستخدم إلى الصفحة الشخصية
  }
);

// إعداد البوت
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});







//-------------------------------------------اوامر الرصيد -------------#
client.once('ready', () => {
console.log(`✅ الحاله الستريمنج شغاله 24 ساعه بوت البنك شغال `)
    // ✅ تعيين حالة البوت إلى Streaming
    client.user.setActivity('فلوسك في أمان 💰', {
        type: ActivityType.Streaming,
        url: 'https://www.twitch.tv/discord' // لازم يكون URL حقيقي للستريمنج وإلا مش هيشتغل
    });
});
client.once("ready", () => console.log(`✅ Bot is ready as ${client.user.tag}`));
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const args = message.content.split(" ");

  if (message.content.startsWith("!addbalance")) {
    if (args.length < 3) return message.reply("❌ الاستخدام الصحيح: !addbalance @المستخدم المبلغ");
    const targetUser = message.mentions.users.first();
    const amount = parseInt(args[2]);
    if (!targetUser || isNaN(amount)) return message.reply("❌ يرجى إدخال المستخدم والمبلغ بشكل صحيح.");
    let balance = (await db.get(`balance_${targetUser.id}`)) || 0;
    balance += amount;
    await db.set(`balance_${targetUser.id}`, balance);
    message.reply(`✅ تم إضافة **${amount} جنيه** إلى ${targetUser.username}.`);
  }

  if (message.content.startsWith("!removebalance")) {
    if (args.length < 3) return message.reply("❌ الاستخدام الصحيح: !removebalance @المستخدم المبلغ");
    const targetUser = message.mentions.users.first();
    const amount = parseInt(args[2]);
    if (!targetUser || isNaN(amount)) return message.reply("❌ يرجى إدخال المستخدم والمبلغ بشكل صحيح.");
    let balance = (await db.get(`balance_${targetUser.id}`)) || 0;
    if (balance < amount) return message.reply("❌ الرصيد غير كافٍ.");
    balance -= amount;
    await db.set(`balance_${targetUser.id}`, balance);
    message.reply(`✅ تم خصم **${amount} جنيه** من ${targetUser.username}.`);
  }

// أمر عرض الرصيد باستخدام QuickDB
client.on('messageCreate', async (message) => {
  if (message.content.startsWith("!balance")) {
    const targetUser = message.mentions.users.first() || message.author;
    const balance = await db.get(`balance_${targetUser.id}`) || 0;
    message.reply(`💰 الرصيد الحالي لـ ${targetUser.username}: **${balance} جنيه**`);
  }
});
//-------------------------------------------اوامر الرصيد -------------#








//-------------------------------------------اوامر التعين---------#

  // أمر تعيين رقم الاستلام

  // أمر تعيين رقم الاستلام
 
  if (message.content.startsWith("!setnum")) {
    if (args.length < 3) return message.reply("❌ الاستخدام الصحيح: !setnum ID المستخدم الرقم");
    const targetUserId = args[1];
    const receiveNumber = args[2];
    if (isNaN(receiveNumber)) return message.reply("❌ يجب أن يكون رقم الاستلام أرقامًا فقط.");
    await db.set(`receive_number_${targetUserId}`, receiveNumber);
    message.reply(`✅ تم تعيين **رقم الاستلام** لـ <@${targetUserId}> إلى: ${receiveNumber}`);
  }

  if (message.content.startsWith("!setsendnum")) {
    if (args.length < 3) return message.reply("❌ الاستخدام الصحيح: !setsendnum ID المستخدم الرقم");
    const targetUserId = args[1];
    const sendNumber = args[2];
    if (isNaN(sendNumber)) return message.reply("❌ يجب أن يكون رقم الإرسال أرقامًا فقط.");
    await db.set(`send_number_${targetUserId}`, sendNumber);
    message.reply(`✅ تم تعيين **رقم الإرسال** لـ <@${targetUserId}> إلى: ${sendNumber}`);
  }

  if (message.content.startsWith("!setnsp")) {
    if (args.length < 3) return message.reply("❌ الاستخدام الصحيح: !setnsp ID المستخدم المبلغ");
    const targetUserId = args[1];
    const taxAmount = args[2];
    if (isNaN(taxAmount)) return message.reply("❌ يجب أن يكون مبلغ الضرائب رقمًا صالحًا.");
    await db.set(`tax_amount_${targetUserId}`, taxAmount);
    message.reply(`✅ تم تعيين **مبلغ الضرائب** لـ <@${targetUserId}> إلى: ${taxAmount}`);
  }

  if (message.content.startsWith("!clearuserdata")) {
    if (args.length < 2) return message.reply("❌ الاستخدام الصحيح: !clearuserdata ID المستخدم");
    const targetUserId = args[1];
    await db.set(`receive_number_${targetUserId}`,"01152810152");
    await db.set(`send_number_${targetUserId}`,"01117097868");
    await db.set(`tax_amount_${targetUserId}`,"305");
   await db.set(`balance_${targetUserId.id}`,0);

    message.reply(`✅ تم **مسح جميع بيانات** <@${targetUserId}> من قاعدة البيانات.`);
  }
  if (message.content.startsWith("!info")) {
    if (args.length < 2) return message.reply("❌ الاستخدام الصحيح: !info ID المستخدم");
    
    const targetUserId = args[1];
    const receiveNumber = await db.get(`receive_number_${targetUserId}`) || "غير متوفر";
    const sendNumber = await db.get(`send_number_${targetUserId}`) || "غير متوفر";
    const taxAmount = await db.get(`tax_amount_${targetUserId}`) || "غير متوفر";
    const balance = await db.get(`balance_${targetUserId}`) || 0;

    return message.reply(
      `**🔹 قائمة المعلومات الخاصة بـ <@${targetUserId}>:**\n` +
      `\`📥\` ➜ رقم الاستلام: **${receiveNumber}**\n` +
      `\`📤\` ➜ رقم الإرسال: **${sendNumber}**\n` +
      `\`💰\` ➜ مبلغ الضرائب: **${taxAmount} جنيه**\n` +
      `\`💳\` ➜ الرصيد الحالي: **${balance} جنيه**`
    );
}


  if (message.content.startsWith("!help")) {
    return message.reply(
      "**🔹 قائمة الأوامر:**\n" +
      "`!setnum الرقم` ➜ تعيين رقم الاستلام.\n" +
      "`!setsendnum الرقم` ➜ تعيين رقم الإرسال.\n" +
      "`!setnsp المبلغ` ➜ تعيين مبلغ الضرائب.\n" +
      "`!clearuserdata @المستخدم` ➜ مسح جميع بيانات المستخدم.\n"
    );
  }
});



//-------------------------------------------اوامر التعين---------#


// تسجيل دخول البوت باستخدام التوكن
client.login(process.env.BOT_TOKEN);

// WebSocket Connection
wss.on('connection', ws => {
  console.log("عميل متصل عبر WebSocket");

  // إرسال بيانات أولية عند الاتصال
  ws.send(JSON.stringify({
    message: 'مرحبًا بك في ملفك الشخصي',
    balance: 0
  }));

  ws.on('close', () => {
    console.log("تم قطع الاتصال مع العميل");
  });
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
