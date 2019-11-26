var config = {
    allowedOrigins: ["http://localhost:3003", "http://localhost:3001", "https://chat.luvapay.com"],
    jwtSecret: '黎振興',
    tokenExpireTime: 100 * 365 * 24 * 60 * 60,
    notifySayHiDays: 10,
    botId: {
        planNotifyBot: '',
        serviceCallback: '5c88df67234faf2bccac3915',
        luvaPayBot: '5c8a01601ddb9830b89369eb'
    },
    // luvaServiceUrl: 'http://localhost:8005',
    // luvaServiceUrl: 'https://api.luvapay.com',
    luvaServiceUrl: 'https://apidev.luvapay.com',
    systemName: 'LuvaPay',
    systemFullName: 'LuvaPay',
    defaultNotifyTitle: ''
}
module.exports = config;

