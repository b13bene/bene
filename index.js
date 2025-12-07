// keep alive + full logs bot
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(PORT, () => console.log(`✅ Web server running on port ${PORT}`));

const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildEmojisAndStickers
    ],
    partials: [Partials.Channel]
});

// أسماء القنوات للـ logs
const logChannelNames = {
    members: 'logs-members',
    messages: 'logs-messages',
    voice: 'logs-voice',
    roles: 'logs-roles',
    channels: 'logs-channels',
    bans: 'logs-bans',
    emojis: 'logs-emojis',
    guild: 'logs-guild'
};
let logChannels = {};

// إنشاء القنوات عند تشغيل البوت إذا لم تكن موجودة
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    const guild = client.guilds.cache.first();
    if (!guild) return console.error('⛔️ لم يتم العثور على السيرفر');

    for (const [key, name] of Object.entries(logChannelNames)) {
        let channel = guild.channels.cache.find(c => c.name === name && c.type === 0);
        if (!channel) {
            channel = await guild.channels.create({
                name: name,
                type: 0,
                permissionOverwrites: [{ id: guild.roles.everyone.id, deny: ['ViewChannel'] }]
            });
        }
        logChannels[key] = channel;
    }
    console.log('✅ جميع قنوات الـ logs جاهزة');
});

// دالة إرسال log على شكل Embed
function sendLog(channel, title, description, color = 0x00FF00) {
    if (!channel) return;
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
    channel.send({ embeds: [embed] }).catch(console.error);
}

// ==================== أحداث العضو ====================
client.on('guildMemberAdd', m => sendLog(logChannels.members, 'دخول عضو', `<@${m.id}> انضم للسيرفر.`));
client.on('guildMemberRemove', m => sendLog(logChannels.members, 'خروج عضو', `<@${m.id}> غادر السيرفر.`));
client.on('guildMemberUpdate', (o, n) => {
    if (o.nickname !== n.nickname)
        sendLog(logChannels.members, 'تغيير الاسم', `<@${n.id}> غيّر اسمه من '${o.nickname || 'None'}' إلى '${n.nickname || 'None'}'`);
    const oldRoles = o.roles.cache.map(r => r.id).join(',');
    const newRoles = n.roles.cache.map(r => r.id).join(',');
    if (oldRoles !== newRoles) sendLog(logChannels.roles, 'تغيير الأدوار', `<@${n.id}> تم تحديث الأدوار.`);
});

// ==================== أحداث الرسائل ====================
client.on('messageCreate', m => { if(!m.author.bot) sendLog(logChannels.messages, 'رسالة جديدة', `<@${m.author.id}> في <#${m.channel.id}>:\n${m.content}`); });
client.on('messageDelete', m => { if(!m.author?.bot) sendLog(logChannels.messages, 'حذف رسالة', `<@${m.author?.id}> في <#${m.channel.id}>:\n${m.content || '[مرفق/Embed]'}`); });
client.on('messageUpdate', (o, n) => { if(!o.author?.bot) sendLog(logChannels.messages, 'تعديل رسالة', `<@${o.author?.id}> في <#${o.channel.id}>:\nقديم: ${o.content || '[مرفق/Embed]'}\nجديد: ${n.content || '[مرفق/Embed]'}`); });

// ==================== أحداث الصوت ====================
client.on('voiceStateUpdate', (o, n) => {
    if (!o.channel && n.channel) sendLog(logChannels.voice, 'دخول صوتي', `<@${n.member.id}> دخل <#${n.channel.id}>`);
    else if (o.channel && !n.channel) sendLog(logChannels.voice, 'خروج صوتي', `<@${o.member.id}> خرج من <#${o.channel.id}>`);
    else if (o.channelId !== n.channelId) sendLog(logChannels.voice, 'تحويل صوتي', `<@${n.member.id}> انتقل من <#${o.channelId}> إلى <#${n.channelId}>`);
});

// ==================== أحداث القنوات ====================
client.on('channelCreate', c => sendLog(logChannels.channels, 'قناة جديدة', `#${c.name} تم إنشاؤها.`));
client.on('channelDelete', c => sendLog(logChannels.channels, 'قناة محذوفة', `#${c.name} تم حذفها.`));
client.on('channelUpdate', (o, n) => sendLog(logChannels.channels, 'تحديث قناة', `#${n.name} تم تحديثها.`));

// ==================== أحداث البان ====================
client.on('guildBanAdd', b => sendLog(logChannels.bans, 'عضو محظور', `<@${b.user.id}> تم حظره.`));
client.on('guildBanRemove', b => sendLog(logChannels.bans, 'رفع الحظر', `<@${b.user.id}> تم رفع الحظر عنه.`));

// ==================== أحداث الإيموجي ====================
client.on('emojiCreate', e => sendLog(logChannels.emojis, 'إيموجي جديد', `:${e.name}: تم إنشاؤه.`));
client.on('emojiDelete', e => sendLog(logChannels.emojis, 'إيموجي محذوف', `:${e.name}: تم حذفه.`));
client.on('emojiUpdate', (o, n) => sendLog(logChannels.emojis, 'تحديث إيموجي', `:${o.name}: تم تحديثه.`));

// ==================== تحديثات السيرفر ====================
client.on('guildUpdate', (o, n) => sendLog(logChannels.guild, 'تحديث السيرفر', `اسم السيرفر تغير من '${o.name}' إلى '${n.name}'`));

client.login(process.env.TOKEN);
