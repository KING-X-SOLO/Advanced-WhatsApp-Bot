// plugins/audio.js

import { toAudio, toMP3 } from '../lib/converter.js'
import { fileTypeFromBuffer } from 'file-type'

export default {
    command: ['tomp3', 'tovn'],
    name: 'تحويل الصوتيات',
    category: 'Converter',
    description: 'تحويل ملف صوتي إلى MP3 أو رسالة صوتية (VN).',
    owner: false,
    async handler(m, { conn, command, text, args }) {
        let q = m.quoted ? m.quoted : m
        let mime = (q.msg || q).mimetype || q.mediaType || ''
        
        if (!/audio/.test(mime)) {
            return m.reply(`قم بالرد على رسالة صوتية أو فيديو باستخدام الأمر *${command}* لتحويله.`)
        }

        try {
            m.reply('جاري التحويل، يرجى الانتظار...')
            
            let media = await q.download()
            let type = await fileTypeFromBuffer(media)
            
            if (command === 'tomp3') {
                // تحويل إلى MP3
                let mp3 = await toMP3(media, type.ext)
                await conn.sendMessage(m.chat, { document: mp3, mimetype: 'audio/mp3', fileName: `audio-${Date.now()}.mp3` }, { quoted: m })
            } else if (command === 'tovn') {
                // تحويل إلى رسالة صوتية (Opus)
                let vn = await toAudio(media, type.ext)
                await conn.sendMessage(m.chat, { audio: vn, mimetype: 'audio/opus', ptt: true }, { quoted: m })
            }
            
        } catch (e) {
            console.error(e)
            m.reply('حدث خطأ أثناء تحويل الصوت.')
        }
    }
}
