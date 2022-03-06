import mqtt from 'mqtt';
import { firestore } from '../firebase/clientApp';
import admin from 'firebase-admin';
import moment from 'moment';

const host = 'driver.cloudmqtt.com';
const port = '18643';
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;

const connectUrl = `mqtt://${host}:${port}`

const client = mqtt.connect(connectUrl, {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username: 'cqbfckol',
    password: 'mpSkyZ4D1N6f',
    reconnectPeriod: 1000,
})



client.on('connect', async () => {
    console.log('Connected');

    const collectionSnapshot = firestore.collection("MacAddress");
    const snapshot = await collectionSnapshot.get();

    snapshot.forEach((snap) => {
        const obj = JSON.parse(JSON.stringify(snap.data()));
        client.subscribe(['ESPs/environment/' + obj.mac_address], () => {
            console.log(`Subscribe to topic ESPs/environment/` + obj.mac_address)
        });
        client.subscribe(['APPr/notification/' + obj.mac_address], () => {
            console.log(`Subscribe to topic APPr/notification/` + obj.mac_address)
        });
        client.subscribe(['ESPs/relay/' + obj.mac_address], () => {
            console.log(`Subscribe to topic ESPs/status/` + obj.mac_address)
        });
    })
})

client.on('message', (topic, payload) => {

    let topicArr = topic.split("/");
    let iTopic = topicArr[0] + "/" + topicArr[1];

    console.log(topic, payload.toString());

    if (iTopic == 'ESPs/environment') {
        environment(payload.toString(), topicArr[2]);
    }

    if (iTopic == 'ESPs/status') {
        status(payload.toString(), topicArr[2]);
    }
    if (iTopic == 'ESPs/relay') {
        warning(payload.toString(), topicArr[2])
    }
})

async function warning(payload: string, mac: string) {
    const objPlayload = JSON.parse(payload);

    const snapshot = await firestore.collection("EspRelay").where('mac_address', '==', mac).get()

    snapshot.forEach(async (snap) => {
        const obj = JSON.parse(JSON.stringify(snap.data()));
        if (obj.relay_id == objPlayload.relay_id && obj.humidity_warning > objPlayload.soil_humidity) {
            const msg = {
                Timestamp: moment().format('YYYY-MM-DDTHH:mm:ss'),
                Message: "Relay " + obj.relay_name + " đang có độ ẩm là " + objPlayload.soil_humidity + ". Vui lòng bơm nước!"
            }
            client.publish("APPr/notification/" + mac, JSON.stringify(msg));

            const snapshotMacAddress = await firestore.collection("MacAddress").where("mac_address", "==", mac).get();

            const snapshotUser: any[] = []

            snapshotMacAddress.forEach(async snapMac => {
                const objMac = JSON.parse(JSON.stringify(snapMac.data()))

                const user = await firestore.collection("User").where("user_email", "==", objMac.user_email).get();
                user.forEach(item => snapshotUser.push(item))
                
                if (obj.auto_on_off) {
                    snapshotUser.forEach(snapUser => {
                        const snapUserObj: any = JSON.parse(JSON.stringify(snapUser.data()));
                        if (snapUserObj.device_token !== '') {
                            admin.messaging().send({
                                token: snapUserObj.device_token,
                                android: {
                                    notification: {
                                        title: 'Thông báo',
                                        body: "Đã bơm " + obj.relay_name + ", thời gian bơm: " + obj.water_time + "giây!",
                                        sound: 'default',
                                        priority: 'high',
                                        imageUrl: 'https://cdn-icons.flaticon.com/png/512/3511/premium/3511683.png?token=exp=1646592949~hmac=d197998afe0882703694d39429fb4ed7'
                                    },
                                },
                            });
                            console.log('send');
                        }
                    })
                }
                else {
                    snapshotUser.forEach(snapUser => {
                        const snapUserObj: any = JSON.parse(JSON.stringify(snapUser.data()));
                        if (snapUserObj.device_token !== '') {
                            admin.messaging().send({
                                token: snapUserObj.device_token,
                                android: {
                                    notification: {
                                        title: 'Cảnh báo',
                                        body: "Relay " + obj.relay_name + " " + objMac.mac_address_name + " đang có độ ẩm là " + objPlayload.soil_humidity + ". Vui lòng bơm nước!",
                                        sound: 'default',
                                        priority: 'high',
                                        imageUrl: 'https://cdn-icons.flaticon.com/png/512/3511/premium/3511683.png?token=exp=1646592949~hmac=d197998afe0882703694d39429fb4ed7'
                                    },
                                },
                            });
                        }
                        console.log('keytest', 123);
                    })
                    
                }
            })

            if (obj.auto_on_off == true) {
                client.publish(`ESPn/RL1${mac}`, "1");
                setTimeout(() => client.publish(`ESPn/RL1${mac}`, "0"), Number(obj.water_time) * 1000)
            }
        }
    })
}

async function status(payload: string, mac: string) {
    const objPlayload = JSON.parse(payload);

    const res = await firestore.collection("EspRelayStatus").add({
        relay_id: objPlayload.relay_id,
        water_time: objPlayload.water_time / 1000,
        water_amount: objPlayload.water_amount,
        mac_address: mac,
        timestamp: moment().format('YYYY-MM-DDTHH:mm:ss')
    });

    console.log("ESPs/status/" + mac + " add done id doc:" + res.id);
}

async function environment(payload: string, mac: string) {
    const objPlayload = JSON.parse(payload);

    const res = await firestore.collection("EspEnvironment").add({
        humidity: objPlayload.humidity,
        mac_address: mac,
        soil_humidity: objPlayload.soil_humidity,
        temperature: objPlayload.temperature
    });

    console.log("ESPs/environment/" + mac + " add done id doc:" + res.id);

    const collectionSnapshot = firestore.collection("EspRelay");
    const snapshot = await collectionSnapshot.get();

    snapshot.forEach((snap) => {
        const obj = JSON.parse(JSON.stringify(snap.data()));
        console.log(obj);
        if (obj.mac_address == mac && obj.relay_id == objPlayload.relay_id && obj.humidity_warning > objPlayload.soil_humidity && obj.auto_on_off == true) {
            const msg = {
                Timestamp: moment().format('YYYY-MM-DDTHH:mm:ss'),
                Message: "Relay " + obj.relay_name + " đang có độ ẩm là " + objPlayload.humidity + ". Vui lòng bơm nước!"
            }
            client.publish("APPr/notification/" + mac, JSON.stringify(msg));
            console.log('notify ');

        }
    })
}

export { client }