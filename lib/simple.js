import path from 'path'  
import { toAudio, toMP3, toSticker } from './converter.js'
import chalk from 'chalk'
import fetch from 'node-fetch'
import PhoneNumber from 'awesome-phonenumber'
import fs from 'fs'
import util from 'util'
import { fileTypeFromBuffer } from 'file-type' 
import { format } from 'util'
import { fileURLToPath } from 'url'
import store from './store.js'
import Jimp from 'jimp'  
import pino from 'pino'
import { Boom } from '@hapi/boom'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** 
 * @type {import('@whiskeysockets/baileys')}
 */
const {
    default: _makeWaSocket,
    makeWALegacySocket,
    proto,
    downloadContentFromMessage,
    jidDecode,
    areJidsSameUser,
    generateWAMessage,
    generateForwardMessageContent,
    generateWAMessageFromContent,
    WAMessageStubType,
    extractMessageContent,
    makeInMemoryStore,
    getAggregateVotesInPollMessage, 
    prepareWAMessageMedia,
    WA_DEFAULT_EPHEMERAL,
    MessageType,
    Mimetype
} = await import('@whiskeysockets/baileys')

const nullish = (x) => x === null || x === undefined

export function makeWASocket(connectionOptions, options = {}) {
    /**
     * @type {import('@whiskeysockets/baileys').WASocket | import('@whiskeysockets/baileys').WALegacySocket}
     */
    let conn = (global.opts && global.opts['legacy'] ? makeWALegacySocket : _makeWaSocket)(connectionOptions)

    let sock = Object.defineProperties(conn, {
        chats: {
            value: { ...(options.chats || {}) },
            writable: true
        },
        decodeJid: {
            value(jid) {
                if (!jid || typeof jid !== 'string') return (!nullish(jid) && jid) || null
                return jid.decodeJid()
            }
        },
        logger: {
            get() {
                return {
                    info(...args) {
                        console.log(
                            chalk.bold.bgRgb(51, 204, 51)('INFO '),
                            `[${chalk.rgb(255, 255, 255)(new Date().toUTCString())}]:`,
                            chalk.cyan(format(...args))
                        )
                    },
                    error(...args) {
                        console.log(
                            chalk.bold.bgRgb(247, 38, 33)('ERROR '),
                            `[${chalk.rgb(255, 255, 255)(new Date().toUTCString())}]:`,
                            chalk.rgb(255, 38, 0)(format(...args))
                        )
                    },
                    warn(...args) {
                        console.log(
                            chalk.bold.bgRgb(255, 153, 0)('WARNING '),
                            `[${chalk.rgb(255, 255, 255)(new Date().toUTCString())}]:`,
                            chalk.redBright(format(...args))
                        )
                    },
                    trace(...args) {
                        console.log(
                            chalk.grey('TRACE '),
                            `[${chalk.rgb(255, 255, 255)(new Date().toUTCString())}]:`,
                            chalk.white(format(...args))
                        )
                    },
                    debug(...args) {
                        console.log(
                            chalk.bold.bgRgb(66, 167, 245)('DEBUG '),
                            `[${chalk.rgb(255, 255, 255)(new Date().toUTCString())}]:`,
                            chalk.white(format(...args))
                        )
                    }
                }
            },
            enumerable: true
        },
        
        // ==================== وظائف إرسال متقدمة ====================
        sendListB: {
            async value(jid, title, text, buttonText, buffer, listSections, quoted, options = {}) {
                let img, video
                
                if (buffer) {
                    try {
                        const type = await conn.getFile(buffer)
                        if (/^image\//i.test(type.mime)) {
                            img = await prepareWAMessageMedia({ image: type.data }, { upload: conn.waUploadToServer })
                        } else if (/^video\//i.test(type.mime)) {
                            video = await prepareWAMessageMedia({ video: type.data }, { upload: conn.waUploadToServer })
                        }
                    } catch (error) {
                        console.error("Error preparing media for List Message:", error);
                    }
                }

                const sections = [...listSections]

                const message = {
                    interactiveMessage: {
                        header: {
                            title: title, 
                            hasMediaAttachment: false,
                            imageMessage: img ? img.imageMessage : null,
                            videoMessage: video ? video.videoMessage : null 
                        }, 
                        body: {text: text}, 
                        nativeFlowMessage: {
                            buttons: [
                                {
                                    name: 'single_select',
                                    buttonParamsJson: JSON.stringify({
                                        title: buttonText,
                                        sections
                                    })
                                }
                            ],
                            messageParamsJson: ''
                        }
                    }
                };

                let msgL = generateWAMessageFromContent(jid, {
                    viewOnceMessage: {
                        message
                    }
                }, { userJid: conn.user.jid, quoted })

                conn.relayMessage(jid, msgL.message, { messageId: msgL.key.id, ...options })
            }
        },
        sendBot: {
            async value(jid, text = '', buffer, title, body, url, quoted, options) {
                if (buffer) try { (type = await conn.getFile(buffer), buffer = type.data) } catch { buffer = buffer }
                let prep = generateWAMessageFromContent(jid, { extendedTextMessage: { text: text, contextInfo: { externalAdReply: { title: title, body: body, thumbnail: buffer, sourceUrl: url }, mentionedJid: await conn.parseMention(text) }}}, { quoted: quoted })
                return conn.relayMessage(jid, prep.message, { messageId: prep.key.id })
            }
        },
        sendPayment: {
            async value(jid, amount, text, quoted, options) {
                conn.relayMessage(jid,  {
                    requestPaymentMessage: {
                        currencyCodeIso4217: 'PEN', // Placeholder currency
                        amount1000: amount,
                        requestFrom: null,
                        noteMessage: {
                            extendedTextMessage: {
                                text: text,
                                contextInfo: {
                                    externalAdReply: {
                                        showAdAttribution: true
                                    }, mentionedJid: conn.parseMention(text) 
                                }
                            }
                        }
                    }
                }, {})
            }
        },        
        getFile: {
            async value(PATH, saveToFile = false) {
                let res, filename
                const data = Buffer.isBuffer(PATH) ? PATH : PATH instanceof ArrayBuffer ? PATH.toBuffer() : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await fetch(PATH)).buffer() : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0)
                if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer')
                const type = await fileTypeFromBuffer(data) || {
                    mime: 'application/octet-stream',
                    ext: '.bin'
                }
                if (data && saveToFile && !filename) (filename = path.join(__dirname, '../tmp/' + new Date * 1 + '.' + type.ext), await fs.promises.writeFile(filename, data))
                return {
                    res,
                    filename,
                    ...type,
                    data,
                    deleteFile() {
                        return filename && fs.promises.unlink(filename)
                    }
                }
            },
            enumerable: true
        },
        waitEvent: {
            value(eventName, is = () => true, maxTries = 25) { //Idk why this exist?
                return new Promise((resolve, reject) => {
                    let tries = 0
                    let on = (...args) => {
                        if (++tries > maxTries) reject('Max tries reached')
                        else if (is()) {
                            conn.ev.off(eventName, on)
                            resolve(...args)
                        }
                    }
                    conn.ev.on(eventName, on)
                })
            }
        },   
        sendContact: {
            async value(jid, data, quoted, options) {
                if (!Array.isArray(data[0]) && typeof data[0] === 'string') data = [data]
                let contacts = []
                for (let [number, name] of data) {
                    number = number.replace(/[^0-9]/g, '')
                    let njid = number + '@s.whatsapp.net'
                    let biz = await conn.getBusinessProfile(njid).catch(_ => null) || {}
                    let vcard = `
BEGIN:VCARD
VERSION:3.0
N:;${name.replace(/\n/g, '\\n')};;;
FN:${name.replace(/\n/g, '\\n')}
TEL;type=CELL;type=VOICE;waid=${number}:${PhoneNumber('+' + number).getNumber('international')}
${biz.description ? `X-WA-BIZ-NAME:${(conn.chats[njid]?.vname || conn.getName(njid) || name).replace(/\n/, '\\n')}\n` : ''}
END:VCARD
`
                    contacts.push({ vcard })
                }
                return conn.sendMessage(jid, { contacts: { displayName: (contacts.length > 1 ? `${contacts.length} contacts` : contacts[0].vcard.split`\n`[2].split(';')[0]) || null, contacts }, ...options }, { quoted })
            }
        },
        
        // ==================== وظائف Baileys الأساسية ====================
        sendText: {
            async value(jid, text, quoted, options) {
                return conn.sendMessage(jid, { text, ...options }, { quoted })
            }
        },
        
        sendImage: {
            async value(jid, buffer, caption, quoted, options) {
                return conn.sendMessage(jid, { image: buffer, caption, ...options }, { quoted })
            }
        },
        
        sendVideo: {
            async value(jid, buffer, caption, quoted, options) {
                return conn.sendMessage(jid, { video: buffer, caption, ...options }, { quoted })
            }
        },
        
        sendAudio: {
            async value(jid, buffer, ptt, quoted, options) {
                return conn.sendMessage(jid, { audio: buffer, ptt, ...options }, { quoted })
            }
        },
        
        sendSticker: {
            async value(jid, buffer, quoted, options) {
                return conn.sendMessage(jid, { sticker: buffer, ...options }, { quoted })
            }
        },
        
        sendMedia: {
            async value(jid, buffer, quoted, options) {
                let { mime, ext, data } = await conn.getFile(buffer)
                let messageType = mime.split('/')[0]
                if (messageType === 'audio') {
                    return conn.sendAudio(jid, data, false, quoted, options)
                } else if (messageType === 'image') {
                    return conn.sendImage(jid, data, '', quoted, options)
                } else if (messageType === 'video') {
                    return conn.sendVideo(jid, data, '', quoted, options)
                } else {
                    return conn.sendMessage(jid, { document: data, mimetype: mime, filename: `${ext} file`, ...options }, { quoted })
                }
            }
        },
        
        sendButton: {
            async value(jid, text, footer, buttons, quoted, options) {
                const buttonMessage = {
                    text,
                    footer,
                    buttons: buttons.map(btn => ({ buttonId: btn[1], buttonText: { displayText: btn[0] }, type: 1 })),
                    ...options
                }
                return conn.sendMessage(jid, buttonMessage, { quoted })
            }
        },
        
        sendList: {
            async value(jid, text, buttonText, sections, quoted, options) {
                const listMessage = {
                    text,
                    buttonText,
                    sections,
                    ...options
                }
                return conn.sendMessage(jid, listMessage, { quoted })
            }
        },
        
        sendPoll: {
            async value(jid, name, values, options) {
                return conn.sendMessage(jid, { poll: { name, values }, ...options })
            }
        },
        
        reply: {
            async value(jid, text, quoted, options) {
                return conn.sendMessage(jid, { text, ...options }, { quoted })
            }
        },
        
        // ==================== وظائف المجموعة ====================
        groupMetadata: {
            async value(jid) {
                return conn.groupMetadata(jid)
            }
        },
        
        groupParticipants: {
            async value(jid) {
                const metadata = await conn.groupMetadata(jid)
                return metadata.participants
            }
        },
        
        groupAdmin: {
            async value(jid) {
                const participants = await conn.groupParticipants(jid)
                return participants.filter(p => p.admin)
            }
        },
        
        groupInviteCode: {
            async value(jid) {
                return conn.groupInviteCode(jid)
            }
        },
        
        groupAcceptInvite: {
            async value(code) {
                return conn.groupAcceptInvite(code)
            }
        },
        
        groupLeave: {
            async value(jid) {
                return conn.groupLeave(jid)
            }
        },
        
        groupUpdateSubject: {
            async value(jid, subject) {
                return conn.groupUpdateSubject(jid, subject)
            }
        },
        
        groupUpdateDescription: {
            async value(jid, description) {
                return conn.groupUpdateDescription(jid, description)
            }
        },
        
        groupUpdateExit: {
            async value(jid, participants) {
                return conn.groupParticipantsUpdate(jid, participants, 'remove')
            }
        },
        
        groupUpdateAdd: {
            async value(jid, participants) {
                return conn.groupParticipantsUpdate(jid, participants, 'add')
            }
        },
        
        groupUpdatePromote: {
            async value(jid, participants) {
                return conn.groupParticipantsUpdate(jid, participants, 'promote')
            }
        },
        
        groupUpdateDemote: {
            async value(jid, participants) {
                return conn.groupParticipantsUpdate(jid, participants, 'demote')
            }
        },
        
        // ==================== وظائف أخرى ====================
        
        parseMention: {
            async value(text) {
                return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
            }
        },
        
        getName: {
            value(jid) {
                const user = global.db.data.users[jid]
                return user?.name || conn.getName(jid)
            }
        },
        
        decodeJid: {
            value(jid) {
                if (!jid || typeof jid !== 'string') return (!nullish(jid) && jid) || null
                return jid.decodeJid()
            }
        },
        
        // ==================== وظائف التحميل ====================
        
        downloadMediaMessage: {
            async value(message) {
                let mime = message.mimetype || ''
                let messageType = mime.split('/')[0]
                let stream = await downloadContentFromMessage(message, messageType)
                let buffer = Buffer.from([])
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk])
                }
                return buffer
            }
        },
        
        // ==================== وظائف التحويل ====================
        
        toAudio: {
            async value(buffer, ext) {
                return toAudio(buffer, ext)
            }
        },
        
        // ==================== وظائف الحالة ====================
        
        updateProfileStatus: {
            async value(status) {
                return conn.updateProfileStatus(status)
            }
        },
        
        updateProfilePicture: {
            async value(jid, buffer) {
                return conn.updateProfilePicture(jid, buffer)
            }
        },
        
        // ==================== وظائف أخرى ====================
        
        sendPresenceUpdate: {
            async value(presence, id) {
                return conn.sendPresenceUpdate(presence, id)
            }
        },
        
        // ==================== وظائف الرسائل ====================
        
        sendMessage: {
            async value(jid, content, options) {
                return conn.sendMessage(jid, content, options)
            }
        },
        
        relayMessage: {
            async value(jid, message, options) {
                return conn.relayMessage(jid, message, options)
            }
        },
        
        // ==================== وظائف التفاعل ====================
        
        sendReaction: {
            async value(jid, key, reaction) {
                return conn.sendMessage(jid, { react: { text: reaction, key } })
            }
        }
        
    })
    
    return sock
}

export function protoType() {
    // Add protoType extensions here if needed
}

export function serialize() {
    // Add serialize extensions here if needed
}

export function smsg(conn, m, hasParent) {
    if (!m) return m
    let M = proto.WebMessageInfo
    if (m.key) {
        m.id = m.key.id
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = conn.decodeJid(m.fromMe && conn.user.id || m.participant || m.key.remoteJid || m.chat || '')
        m.device = m.key.id.startsWith('3EB0') ? 'android' : m.key.id.startsWith('3EB1') ? 'ios' : 'web'
    }
    if (m.message) {
        m.mtype = Object.keys(m.message)[0]
        m.msg = m.message[m.mtype]
        if (m.mtype === 'ephemeralMessage') {
            m.message = m.msg.message
            m.mtype = Object.keys(m.message)[0]
            m.msg = m.message[m.mtype]
        }
        let quoted = m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null
        if (m.quoted) {
            let type = Object.keys(m.quoted)[0]
            m.quoted = m.quoted[type]
            if (['productMessage'].includes(type)) {
                type = Object.keys(m.quoted)[0]
                m.quoted = m.quoted[type]
            }
            if (typeof m.quoted === 'string') m.quoted = { text: m.quoted }
            m.quoted.mtype = type
            m.quoted.id = m.msg.contextInfo.stanzaId
            m.quoted.chat = conn.decodeJid(m.msg.contextInfo.remoteJid || m.chat || m.sender)
            m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false
            m.quoted.sender = conn.decodeJid(m.msg.contextInfo.participant)
            m.quoted.fromMe = m.quoted.sender === conn.user.jid
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || ''
            m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
            m.getQuotedObj = m.getQuotedMessage = async () => {
                if (!m.quoted.id) return false
                let q = await conn.loadMessage(m.quoted.chat, m.quoted.id)
                return smsg(conn, q)
            }
            let vM = m.quoted.fakeObj = M.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id
                },
                message: quoted,
                ...(m.isGroup ? { participant: m.quoted.sender } : {})
            })
            if (m.quoted.url) m.quoted.download = (pathFile = undefined) => conn.downloadMediaMessage(m.quoted, pathFile)
            m.quoted.copy = () => smsg(conn, vM)
            m.quoted.reply = (text, chatId = m.quoted.chat, options = {}) => conn.sendMessage(chatId, { text }, { quoted: vM, ...options })
            m.quoted.edit = (text, options) => conn.sendMessage(m.quoted.chat, { text, edit: vM.key }, options)
            m.quoted.delete = () => conn.sendMessage(m.quoted.chat, { delete: vM.key })
        }
        if (m.msg.url) m.download = (pathFile = undefined) => conn.downloadMediaMessage(m.msg, pathFile)
        m.text = m.msg.text || m.msg.caption || m.msg.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || ''
        m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
        m.reply = (text, chatId = m.chat, options = {}) => conn.sendMessage(chatId, { text }, { quoted: m, ...options })
        m.copy = () => smsg(conn, M.fromObject(M.toObject(m)))
        m.edit = (text, options) => conn.sendMessage(m.chat, { text, edit: m.key }, options)
        m.delete = () => conn.sendMessage(m.chat, { delete: m.key })
    }
    return m
}
