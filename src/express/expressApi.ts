import express from 'express';
import moment from 'moment';
import { firestore } from '../firebase/clientApp';

const app = express();
const PORT = 8000;

app.use(express.json());
app.use(express.urlencoded());

app.get('/', (req, res) => res.send('IOT HUST'));

app.post('/api/device', async (req, res) => {

    const jsonBody = req.body;

    const mac = await firestore.collection("MacAddress").add({
        mac_address: jsonBody.mac_address
    })

    await firestore.collection("User").add({
        user_id: mac.id,
        mac_address: jsonBody.mac_address,
        user_name: jsonBody.user_name
    })

    res.json({
        user_id: mac.id
    });

});

app.listen(PORT, () => {
    console.log(`⚡️[server]: Server is running at localhost:${PORT}`);
});

app.post('/api/statistic', async (req, res) => {
    const jsonBody = req.body;

    const espRelayCollectionSnapshot = firestore.collection("EspRelay");

    const snapshotEspRelay = await espRelayCollectionSnapshot.where('relay_id', '==', jsonBody.relay_id).get();

    var relayName = ""
    var mac = ""
    snapshotEspRelay.forEach((snap) => {
        const obj = JSON.parse(JSON.stringify(snap.data()));
        relayName = obj.relay_name;
        mac = obj.mac_address;
    })


    const espRelayStatusCollectionSnapshot = firestore.collection("EspRelayStatus");

    const snapshot = await espRelayStatusCollectionSnapshot.get();

    let totalAmount = 0;
    let totalTime = 0;
    let totalAmountCount = 0;
    let totalTimeCount = 0;

    snapshot.forEach((snap) => {
        const obj = JSON.parse(JSON.stringify(snap.data()));
        const time = moment(obj.timestamp, "YYYY-DD-MMTHH:mm:ss")
        const timeFrom = moment(jsonBody.time_from, "YYYY-DD-MMTHH:mm:ss")
        const timeTo = moment(jsonBody.time_to, "YYYY-DD-MMTHH:mm:ss")

        if (obj.relay_id == jsonBody.relay_id && mac == jsonBody.mac_address && time.isBetween(timeFrom, timeTo)) {
            totalAmount += obj.water_amount;
            totalAmountCount++;
            var espTimeOn = moment(obj.time_on, "YYYY-DD-MMTHH:mm:ss");
            var espTimeOff = moment(obj.time_off, "YYYY-DD-MMTHH:mm:ss");
            var duration = moment.duration(espTimeOff.diff(espTimeOn));
            var second = duration.asSeconds();
            totalTime += second;
            totalTimeCount++;
        }
    })

    res.json({
        relay_id: jsonBody.relay_id,
        relay_name: relayName,
        water_time: totalTime / totalTimeCount,
        water_amount: totalAmount / totalAmountCount,
        timestamp: moment().format('YYYY-DD-MMTHH:mm:ss')
    })

});

export { app }
