// plugins/economy-profile.js

import { addExp, checkLevelUp } from '../lib/economy.js'

export default {
    command: ['profile', 'me', 'bal', 'bank'],
    name: 'الملف الشخصي والاقتصاد',
    category: 'Economy',
    description: 'عرض الملف الشخصي، الرصيد، والمستوى.',
    owner: false,
    async handler(m, { conn, command, text, args, isOwner }) {
        const user = global.db.data.users[m.sender];
        if (!user) return m.reply('لم يتم تسجيلك بعد. يرجى التسجيل أولاً.');

        // إضافة نقاط خبرة عشوائية عند استخدام أمر
        addExp(m.sender, Math.floor(Math.random() * 5) + 1);
        
        const levelUp = checkLevelUp(m.sender);
        if (levelUp) {
            m.reply(`🎉 تهانينا! لقد ارتفعت إلى المستوى ${user.level}!`);
        }

        const requiredExp = 100 * (user.level + 1);
        const progress = Math.floor((user.exp / requiredExp) * 100);

        let profileText = `
*👤 الملف الشخصي لـ ${user.name}*

*🌟 المستوى:* ${user.level}
*✨ الخبرة (EXP):* ${user.exp}/${requiredExp} (${progress}%)
*💰 الرصيد (Coins):* ${user.coin}
*🏦 البنك (Bank):* ${user.bank}
*💎 الماس (Diamond):* ${user.diamond}
*🛡️ الصحة (Health):* ${user.health}

*⚙️ معلومات إضافية:*
*الرتبة:* ${user.role}
*مستخدم مميز:* ${user.premium ? '✅' : '❌'}
*محظور:* ${user.banned ? '✅' : '❌'}
`.trim();

        conn.sendMessage(m.chat, { text: profileText }, { quoted: m });
    }
}
