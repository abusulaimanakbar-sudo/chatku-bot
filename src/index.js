const { makeChatKuSocket, DisconnectReason, DEFAULT_URL } = require('./socket')
const { useMultiFileAuthState } = require('./auth')

module.exports = makeChatKuSocket
module.exports.default = makeChatKuSocket
module.exports.makeChatKuSocket = makeChatKuSocket
module.exports.useMultiFileAuthState = useMultiFileAuthState
module.exports.DisconnectReason = DisconnectReason
module.exports.DEFAULT_URL = DEFAULT_URL
