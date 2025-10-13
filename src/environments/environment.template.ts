export const environment = {
    production: false,
    staging: false,
    firebase: {
        apiKey: "AIzaSyAp4EW44oPvCZKixAE7dIg2UHHb_I5WQ0Y",
        authDomain: "andestripmanager.firebaseapp.com",
        projectId: "andestripmanager",
        storageBucket: "andestripmanager.firebasestorage.app",
        messagingSenderId: "178668301606",
        appId: "1:178668301606:web:206de5961fd902d16f25e7",
        measurementId: "G-63GWRS6QVR"
    },
    weather: {
        apiKey: "YOUR_OPENWEATHERMAP_API_KEY", // Obtenha sua chave em: https://home.openweathermap.org/api_keys
        baseUrl: "https://api.openweathermap.org/data/2.5",
        units: "metric", // Celsius
        lang: "pt_br"
    },
    debug: true,
    logLevel: 'debug'
};
