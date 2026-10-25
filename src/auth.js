const fs = require('fs')
const path = require('path')

// Simpan sesi bot (botId + token) di folder, mirip useMultiFileAuthState milik Baileys.
async function useMultiFileAuthState(folder) {
  fs.mkdirSync(folder, { recursive: true })
  const file = path.join(folder, 'creds.json')

  let creds = null
  try {
    creds = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {}

  const state = { creds }
  const saveCreds = async () => {
    const tmp = file + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(state.creds, null, 2))
    fs.renameSync(tmp, file)
  }
  const clear = async () => {
    state.creds = null
    try {
      fs.unlinkSync(file)
    } catch {}
  }
  return { state, saveCreds, clear }
}

module.exports = { useMultiFileAuthState }
