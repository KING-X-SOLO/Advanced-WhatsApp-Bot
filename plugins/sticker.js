// plugins/sticker.js

import { toSticker } from '../lib/converter.js'
import { fileTypeFromBuffer } from 'file-type'
import fs from 'fs'

export default {
    command: ['sticker', 's', 'stiker'],
    name: 'تحويل إلى ملصق',
    category: 'Sticker',
    description: 'تحويل صورة أو فيديو إلى ملصق واتساب.',
    owner: false,
    async handler(m, { conn, command, text, args }) {
        let q = m.quoted ? m.quoted : m
        let mime = (q.msg || q).mimetype || q.mediaType || ''
        
        if (!/image|video/.test(mime)) {
            return m.reply(`قم بالرد على صورة أو فيديو (أقل من 5 ثواني) باستخدام الأمر *${command}* لتحويله إلى ملصق.`)
        }
        
        if (/video/.test(mime) && (q.msg || q).seconds > 5) {
            return m.reply('الفيديو طويل جداً. يجب أن يكون أقل من 5 ثواني.')
        }

        try {
            m.reply('جاري التحويل إلى ملصق، يرجى الانتظار...')
            
            let media = await q.download()
            let type = await fileTypeFromBuffer(media)
            
            // تحويل إلى ملصق
            let sticker = await toSticker(media, type.ext)
            
            // إرسال الملصق
            await conn.sendMessage(m.chat, { sticker: sticker }, { quoted: m })
            
        } catch (e) {
            console.error(e)
            m.reply('حدث خطأ أثناء تحويل الوسائط إلى ملصق.')
        }
    }
}
