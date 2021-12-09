import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

var serviceAccount = require('./service-account-file.json');

initializeApp({
    credential: cert(serviceAccount),
    databaseURL: "https://realtimedb-68f06.firebaseio.com"
});

const firestore = getFirestore();

export { firestore };