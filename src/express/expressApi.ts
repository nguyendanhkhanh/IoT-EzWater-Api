import express from 'express';
import moment from 'moment';
import { firestore } from '../firebase/clientApp';
import { getInitRelay } from '../ultil/EspRelay';
import { client } from '../mqtt/clientMqtt';
import admin from 'firebase-admin';


const app = express();
const PORT = 8000;

app.use(express.json());
app.use(express.urlencoded());

app.get('/', (req, res) => res.send('IOT HUST'));

app.post('/api/save-token', async (req, res) => {
    const { email, device_token } = req.body;

    try {
        const snapshotUser = await firestore.collection("User").where("user_email", "==", email).get();
        snapshotUser.forEach((snap) => {
            firestore.collection("User").doc(snap.id).update({
                device_token: device_token
            })
        })
        res.json({ message: 'Save device token successfully!' });
        console.log({ message: 'Save device token successfully!' });
        
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ message: error.message });
        }
    }
});

app.post('/api/publish', async (req, res) => {
    const jsonBody = req.body
    client.publish(jsonBody.topic, jsonBody.status);
    console.log('done');
    res.send("success - 200");
    return;
})

app.post('/api/device', async (req, res) => {

    const jsonBody = req.body;

    if (jsonBody.user_email == undefined) {
        res.send("bad request – error 400");
        return;
    }

    const macAddressCollectionSnapshot = firestore.collection("MacAddress");

    const listDevices: any[] = jsonBody.devices
    for (let i = 0; i < listDevices.length; i++) {
        if (listDevices[i].id === '') {
            await firestore.collection("MacAddress").add({
                mac_address: listDevices[i].mac_address,
                user_email: jsonBody.user_email,
                mac_address_name: listDevices[i].mac_address_name ? listDevices[i].mac_address_name : `Địa chỉ MAC: ${listDevices[i].mac_address}`
            })
            const initListRelay = getInitRelay(listDevices[i].mac_address)
            initListRelay.forEach(item => firestore.collection("EspRelay").add(item))
        }
        else {
            await firestore.collection("MacAddress").doc(listDevices[i].id).update({
                mac_address: listDevices[i].mac_address,
                mac_address_name: listDevices[i].mac_address_name ? listDevices[i].mac_address_name : `Địa chỉ MAC: ${listDevices[i].mac_address}`
            })
        }
    }

    const snapshotMacAddress = await macAddressCollectionSnapshot.where("user_email", "==", jsonBody.user_email).get();
    var jsonRes: any[] = [];
    snapshotMacAddress.forEach((snap) => {
        const obj = JSON.parse(JSON.stringify(snap.data()));
        jsonRes.push(obj);
    })

    res.json(jsonRes);

});

app.listen(PORT, () => {
    console.log(`⚡️[server]: Server is running at localhost:${PORT}`);
});

app.post('/api/mac-address', async (req, res) => {
    const jsonBody = req.body

    const macAddressCollectionSnapshot = firestore.collection("MacAddress");

    const snapshotMacAddress = await macAddressCollectionSnapshot.where("user_email", "==", jsonBody.user_email).get();

    var jsonRes: any[] = [];
    snapshotMacAddress.forEach((snap) => {
        const obj = JSON.parse(JSON.stringify(snap.data()));
        obj.id = snap.id
        jsonRes.push(obj);
    })

    res.json(jsonRes);

})

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

    const snapshot = await espRelayStatusCollectionSnapshot.where('mac_address', '==', jsonBody.mac_address).get();

    var jsonRes: any[] = [];


    snapshot.forEach((snap) => {
        const obj = JSON.parse(JSON.stringify(snap.data()));
        const time = moment(obj.timestamp, "YYYY-MM-DDTHH:mm:ss")
        const timeFrom = moment(jsonBody.time_from, "YYYY-MM-DDTHH:mm:ss")
        const timeTo = moment(jsonBody.time_to, "YYYY-MM-DDTHH:mm:ss")
        console.log(time, timeFrom, timeTo);

        if (obj.relay_id == jsonBody.relay_id && time.isBetween(timeFrom, timeTo)) {
            jsonRes.push(obj)
        }
    })

    console.log(jsonRes)
    if (jsonRes.length == 0) {
        res.send("null");
    } else {
        res.json(jsonRes);
    }
});

export { app }
