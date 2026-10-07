import makeWASocket, { 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys'
import P from 'pino'
import qrcode from 'qrcode-terminal'
import { readFileSync } from 'fs'
import 'dotenv/config'

const schedule = JSON.parse(readFileSync('./config/schedule.json', 'utf-8'))

const number = process.env.TARGET_NUMBER;
const jid = number + "@s.whatsapp.net"

const sentReminders = new Set()

// Cek apakah mode testing
const isTestMode = process.argv.includes('--test')
const testMessage = process.argv[process.argv.indexOf('--msg') + 1] || 'Test pesan dari bot! ✅'

function getDayName(date) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    return dayNames[date.getDay()]
}

function getScheduledReminder(now) {
    const currentDay = getDayName(now)
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    const todaySchedule = schedule[currentDay] || []
    
    for (const reminder of todaySchedule) {
        if (currentHour === reminder.hour && currentMinute === reminder.minute) {
            const key = `${currentDay}-${currentHour}-${currentMinute}`
            const message = `${reminder.text}\n\n${reminder.link}`;
            if (!sentReminders.has(key)) {
                sentReminders.add(key)
                setTimeout(() => sentReminders.delete(key), 60000)
                return message
            }
        }
    }
    return null
}

function printSchedule() {
    console.log('\n📅 Jadwal aktif:')
    for (const [day, reminders] of Object.entries(schedule)) {
        if (reminders.length > 0) {
            console.log(`  ${day}:`)
            reminders.forEach(r => {
                console.log(`    - ${String(r.hour).padStart(2,'0')}:${String(r.minute).padStart(2,'0')} → "${r.text}"`)
            })
        }
    }
    console.log('')
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        keepAliveIntervalMs: 15000,
        connectTimeoutMs: 30000,
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update

        if (qr) {
            console.log('⚠️  Sesi tidak ditemukan atau expired. Jalankan ulang dan scan QR.')
            qrcode.generate(qr, { small: true })
        }

        if (connection === 'close') {
            console.log('Koneksi terputus. Reconnecting...')
            startBot()
        } else if (connection === 'open') {
            console.log('✅ Bot terhubung!\n')

            // MODE TEST: kirim pesan lalu exit
            if (isTestMode) {
                console.log(`🧪 Mode testing aktif`)
                console.log(`📤 Mengirim ke: ${jid}`)
                console.log(`💬 Pesan: "${testMessage}"\n`)
                try {
                    await sock.sendMessage(jid, { text: testMessage })
                    console.log('✅ Pesan test berhasil dikirim!')
                } catch (err) {
                    console.log('❌ Gagal kirim pesan:', err.message)
                }
                setTimeout(() => process.exit(0), 2000) // tunggu sebentar lalu exit
                return
            }

            // MODE NORMAL: jalankan scheduler
            printSchedule()
            setInterval(async () => {
                const now = new Date()
                const reminderText = getScheduledReminder(now)
                if (reminderText) {
                    try {
                        await sock.sendMessage(jid, { text: reminderText })
                        console.log(`📨 Reminder terkirim (${now.toLocaleString()})`)
                    } catch (err) {
                        console.log('❌ Gagal kirim reminder:', err.message)
                    }
                }
            }, 30000)
        }
    })
}

startBot()