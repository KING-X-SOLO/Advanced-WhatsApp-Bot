// plugins/menu.js

export default {
    command: ['menu', 'help', 'start', 'm'],
    name: 'قائمة الأوامر',
    category: 'General',
    description: 'عرض قائمة بجميع الأوامر المتاحة.',
    owner: false,
    async handler(m, { conn, command, text, args }) {
        const plugins = global.plugins;
        const categories = {};

        // تجميع الأوامر حسب الفئة
        for (const name in plugins) {
            const plugin = plugins[name];
            if (plugin.command) {
                const category = plugin.category || 'Uncategorized';
                if (!categories[category]) {
                    categories[category] = [];
                }
                const commands = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
                const isOwnerCommand = plugin.owner || false;
                
                categories[category].push({
                    command: commands[0],
                    description: plugin.description || 'لا يوجد وصف',
                    isOwnerCommand: isOwnerCommand
                });
            }
        }

        let menuText = `
*🤖 ${global.BOT_NAME} - قائمة الأوامر الشاملة*
*Prefix:* ${global.PREFIX}
*المطور:* ${global.BOT_AUTHOR}

*مرحباً بك في البوت المتقدم!*
يمكنك استخدام الأوامر التالية:

`.trim() + '\n\n';

        for (const category in categories) {
            menuText += `*━━━「 ${category} 」━━━*\n`;
            for (const cmd of categories[category]) {
                menuText += `*${global.PREFIX}${cmd.command}* - ${cmd.description} ${cmd.isOwnerCommand ? '👑' : ''}\n`;
            }
            menuText += '\n';
        }

        menuText += `
*ملاحظة:*
👑 تعني أن الأمر مخصص للمطورين فقط.
هذا البوت قيد التطوير الشامل.
`.trim();

        conn.sendMessage(m.chat, { text: menuText }, { quoted: m });
    }
}
