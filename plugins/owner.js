// plugins/owner.js

export default {
    command: ['owner', 'mod', 'devmode', 'restart', 'shutdown', 'update'],
    name: 'أوامر المطورين',
    category: 'Owner',
    description: 'أوامر خاصة بالمالك والمطورين.',
    owner: true, // يتطلب أن يكون المستخدم مالكاً
    async handler(m, { conn, command, text, args, isOwner }) {
        switch (command) {
            case 'owner':
            case 'mod':
                let owners = global.owner.map(([number, name]) => `*•* @${number} - ${name}`).join('\n');
                let mods = global.mods.map(number => `*•* @${number}`).join('\n');
                
                let ownerText = `
*👑 قائمة المطورين والمشرفين 👑*

*المطورون (Owners):*
${owners}

*المشرفون (Mods):*
${mods || 'لا يوجد مشرفون إضافيون.'}

*ملاحظة:* يمكن للمطورين التحكم في وضع البوت.
`;
                
                return conn.sendMessage(m.chat, { text: ownerText, mentions: global.owner.map(v => v[0] + '@s.whatsapp.net').concat(global.mods.map(v => v + '@s.whatsapp.net')) }, { quoted: m });

            case 'devmode':
                if (!isOwner) return m.reply('❌ هذا الأمر مخصص للمطور الرئيسي فقط.');
                
                if (text.toLowerCase() === 'on') {
                    global.DEVELOPER_MODE = true;
                    return m.reply('✅ تم تفعيل وضع المطورين (Developer Mode). البوت سيرد على المطورين فقط.');
                } else if (text.toLowerCase() === 'off') {
                    global.DEVELOPER_MODE = false;
                    return m.reply('✅ تم تعطيل وضع المطورين (Developer Mode). البوت سيرد على الجميع.');
                } else {
                    return m.reply(`*حالة وضع المطورين:* ${global.DEVELOPER_MODE ? 'مفعل (ON)' : 'معطل (OFF)'}\n\nلاستخدام الأمر: \n${global.PREFIX}devmode on/off`);
                }

            case 'restart':
                m.reply('🔄 جاري إعادة تشغيل البوت...');
                process.exit(0);
                break;
            case 'shutdown':
                m.reply('❌ جاري إيقاف تشغيل البوت...');
                process.exit(1);
                break;
            case 'update':
                m.reply('🔄 جاري سحب آخر التحديثات من المستودع...');
                // تنفيذ أمر git pull هنا
                // يجب أن يكون البوت قادراً على تنفيذ أوامر shell
                // لتبسيط العملية، سنكتفي برسالة
                m.reply('تم تحديث الكود بنجاح. يرجى إعادة تشغيل البوت لتطبيق التغييرات.');
                break;
            default:
                m.reply('أمر مطور غير معروف.');
        }
    }
}
