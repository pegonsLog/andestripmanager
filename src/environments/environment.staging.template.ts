export const environment = {
    production: false,
    staging: true,
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
    googleMaps: {
        apiKey: "YOUR_GOOGLE_MAPS_API_KEY" // IMPORTANTE: Substitua pela sua chave do Google Maps
        // Obtenha em: https://console.cloud.google.com/google/maps-apis
        // Esta chave NÃO será commitada (arquivo está no .gitignore)
    },
    debug: true,
    logLevel: 'debug'
};
