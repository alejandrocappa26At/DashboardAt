const firebaseConfig = {
    apiKey: "AIzaSyCvH8OtILDWn2Vpro4gmYEY1niqM6LU5Z8",
    authDomain: "dashboard-ventasat.firebaseapp.com",
    projectId: "dashboard-ventasat",
    storageBucket: "dashboard-ventasat.firebasestorage.app",
    messagingSenderId: "497692348374",
    appId: "1:497692348374:web:50b4400b78d7623dd11e77",
    measurementId: "G-JYXDFTSEJH"
};

firebase.initializeApp(firebaseConfig);
window.db = firebase.firestore();

console.log("FIREBASE OK VERSION 2");