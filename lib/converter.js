import { fileTypeFromBuffer } from 'file-type'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * تحويل ملف صوتي إلى OGG/Opus
 * @param {Buffer} buffer 
 * @param {String} ext 
 * @returns {Promise<Buffer>}
 */
export function toAudio(buffer, ext) {
    return new Promise((resolve, reject) => {
        const tmp = path.join(__dirname, '../tmp', Date.now() + '.' + ext)
        const out = tmp + '.opus'
        fs.promises.writeFile(tmp, buffer)
            .then(() => {
                spawn('ffmpeg', [
                    '-i', tmp,
                    '-vn',
                    '-c:a', 'libopus',
                    '-b:a', '128k',
                    '-vbr', 'on',
                    '-compression_level', '10',
                    out
                ])
                .on('error', reject)
                .on('close', async (code) => {
                    try {
                        await fs.promises.unlink(tmp)
                        if (code !== 0) return reject(code)
                        resolve(await fs.promises.readFile(out))
                        await fs.promises.unlink(out)
                    } catch (e) {
                        reject(e)
                    }
                })
            })
            .catch(reject)
    })
}

/**
 * تحويل ملف صوتي إلى MP3
 * @param {Buffer} buffer 
 * @param {String} ext 
 * @returns {Promise<Buffer>}
 */
export function toMP3(buffer, ext) {
    return new Promise((resolve, reject) => {
        const tmp = path.join(__dirname, '../tmp', Date.now() + '.' + ext)
        const out = tmp + '.mp3'
        fs.promises.writeFile(tmp, buffer)
            .then(() => {
                spawn('ffmpeg', [
                    '-i', tmp,
                    '-vn',
                    '-acodec', 'libmp3lame',
                    '-ac', '2',
                    '-ab', '128k',
                    '-ar', '44100',
                    out
                ])
                .on('error', reject)
                .on('close', async (code) => {
                    try {
                        await fs.promises.unlink(tmp)
                        if (code !== 0) return reject(code)
                        resolve(await fs.promises.readFile(out))
                        await fs.promises.unlink(out)
                    } catch (e) {
                        reject(e)
                    }
                })
            })
            .catch(reject)
    })
}

/**
 * تحويل صورة/فيديو إلى ملصق (Sticker)
 * @param {Buffer} buffer 
 * @param {String} ext 
 * @param {Object} metadata 
 * @returns {Promise<Buffer>}
 */
export function toSticker(buffer, ext, metadata = {}) {
    return new Promise((resolve, reject) => {
        const tmp = path.join(__dirname, '../tmp', Date.now() + '.' + ext)
        const out = tmp + '.webp'
        fs.promises.writeFile(tmp, buffer)
            .then(() => {
                const ffmpegArgs = [
                    '-i', tmp,
                    '-vcodec', 'libwebp',
                    '-vf', 'scale=\'min(320,iw)\':min(320,ih):force_original_aspect_ratio=decrease,format=rgba,pad=320:320:(ow-iw)/2:(oh-ih)/2:color=white@0.0,setsar=1',
                    '-loop', '0',
                    '-ss', '00:00:00.0',
                    '-t', '00:00:05.0', // 5 ثواني كحد أقصى للفيديو
                    '-preset', 'default',
                    '-an',
                    '-vsync', '0',
                    '-s', '512x512',
                    out
                ]
                
                spawn('ffmpeg', ffmpegArgs)
                .on('error', reject)
                .on('close', async (code) => {
                    try {
                        await fs.promises.unlink(tmp)
                        if (code !== 0) return reject(code)
                        resolve(await fs.promises.readFile(out))
                        await fs.promises.unlink(out)
                    } catch (e) {
                        reject(e)
                    }
                })
            })
            .catch(reject)
    })
}
