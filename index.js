// ===================== KEEP ALIVE =====================
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));


// ===================== DISCORD BOT =====================
const {
    Client,
    GatewayIntentBits,
    Partials,
    ChannelType,
    EmbedBuilder
} = require('discord.js');

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
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember
    ]
});


// أسماء قنوات اللوجز
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


// ===================== إنشاء القنوات =====================
client.once('ready', async () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);

    const guild = client.guilds.cache.first();
    if (!guild) return console.log("❌ No guild found");

    for (const [key, name] of Object.entries(logChannelNames)) {
        let channel = guild.channels.cache.find(
            c => c.name === name && c.type === ChannelType.GuildText
        );

        if (!channel) {
            channel = await guild.channels.create({
                name: name,
                type: ChannelType.GuildText,
                permissionOverwrites: [{
                    id: guild.roles.everyone.id,
                    deny: ['ViewChannel']
                }]
            });
        }

        logChannels[key] = channel;
    }

    console.log("✅ All log channels are ready!");
});


// ===================== دالة إرسال اللوج =====================
function sendLog(channel, title, description, color = 0x00FF00) {
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    channel.send({ embeds: [embed] }).catch(() => {});
}


// ===================== Logs الأعضاء =====================
client.on('guildMemberAdd', m =>
    sendLog(logChannels.members, 'دخول عضو', `<@${m.id}> انضم للسيرفر.`)
);

client.on('guildMemberRemove', m =>
    sendLog(logChannels.members, 'خروج عضو', `<@${m.id}> غادر السيرفر.`)
);

client.on('guildMemberUpdate', (oldM, newM) => {
    if (oldM.nickname !== newM.nickname)
        sendLog(logChannels.members, 'تغيير الاسم',
            `<@${newM.id}> غيّر اسمه من **${oldM.nickname || 'بدون'}** إلى **${newM.nickname || 'بدون'}**`);

    const oldRoles = oldM.roles.cache.map(r => r.id);
    const newRoles = newM.roles.cache.map(r => r.id);

    if (oldRoles.join(',') !== newRoles.join(','))
        sendLog(logChannels.roles, 'تغيير الأدوار', `<@${newM.id}> تم تحديث الأدوار.`);
});


// ===================== Logs الرسائل =====================
client.on('messageCreate', m => {
    if (m.author.bot) return;
    sendLog(logChannels.messages, 'رسالة جديدة',
        `<@${m.author.id}> في <#${m.channel.id}>:\n${m.content}`);
});

client.on('messageDelete', m => {
    if (m?.author?.bot) return;
    sendLog(logChannels.messages, 'حذف رسالة',
        `<@${m.author?.id}> في <#${m.channel?.id}>:\n${m.content || '[مرفق/Embed]'}`);
});

client.on('messageUpdate', (o, n) => {
    if (o?.author?.bot) return;
    sendLog(logChannels.messages, 'تعديل رسالة',
        `<@${o.author?.id}> في <#${o.channel.id}>:\n**قديم:** ${o.content}\n**جديد:** ${n.content}`);
});


// ===================== Logs الصوت =====================
client.on('voiceStateUpdate', (o, n) => {
    if (!o.channel && n.channel)
        sendLog(logChannels.voice, 'دخول صوتي', `<@${n.member.id}> دخل <#${n.channel.id}>`);
    else if (o.channel && !n.channel)
        sendLog(logChannels.voice, 'خروج صوتي', `<@${o.member.id}> خرج من <#${o.channel.id}>`);
    else if (o.channelId !== n.channelId)
        sendLog(logChannels.voice, 'تحويل صوتي',
            `<@${n.member.id}> من <#${o.channelId}> إلى <#${n.channelId}>`);
});


// ===================== Logs القنوات =====================
client.on('channelCreate', c =>
    sendLog(logChannels.channels, 'قناة جديدة', `#${c.name} تم إنشاؤها.`)
);

client.on('channelDelete', c =>
    sendLog(logChannels.channels, 'قناة محذوفة', `#${c.name} تم حذفها.`)
);

client.on('channelUpdate', (o, n) =>
    sendLog(logChannels.channels, 'تحديث قناة', `تم تحديث #${n.name}.`)
);


// ===================== Logs البان =====================
client.on('guildBanAdd', b =>
    sendLog(logChannels.bans, 'بان', `<@${b.user.id}> تم حظره.`)
);

client.on('guildBanRemove', b =>
    sendLog(logChannels.bans, 'رفع البان', `<@${b.user.id}> تم رفع الحظر.`)
);


// ===================== Logs الإيموجي =====================
client.on('emojiCreate', e =>
    sendLog(logChannels.emojis, 'إيموجي جديد', `:${e.name}: تم إنشاؤه.`)
);

client.on('emojiDelete', e =>
    sendLog(logChannels.emojis, 'إيموجي محذوف', `:${e.name}: تم حذفه.`)
);

client.on('emojiUpdate', (o, n) =>
    sendLog(logChannels.emojis, 'تحديث إيموجي', `:${o.name}: تم تحديثه.`)
);


// ===================== Logs السيرفر =====================
client.on('guildUpdate', (o, n) =>
    sendLog(logChannels.guild, 'تحديث السيرفر',
        `الاسم تغيّر من "${o.name}" إلى "${n.name}"`)
);


// ===================== تسجيل الدخول =====================
client.login(process.env.TOKEN);
