export const getInitRelay = (macAddress: string) => {
    return [
        {
            mac_address: macAddress,
            relay_id: "1",
            relay_name: "Van 1",
            water_amount: 20,
            water_time: 60,
            auto_on_off: false,
            humidity_warning: 50
        },
        {
            mac_address: macAddress,
            relay_id: "2",
            relay_name: "Van 2",
            water_amount: 20,
            water_time: 60,
            auto_on_off: false,
            humidity_warning: 50
        },
        {
            mac_address: macAddress,
            relay_id: "3",
            relay_name: "Van 3",
            water_amount: 20,
            water_time: 60,
            auto_on_off: false,
            humidity_warning: 50
        },
        {
            mac_address: macAddress,
            relay_id: "4",
            relay_name: "Van 4",
            water_amount: 20,
            water_time: 60,
            auto_on_off: false,
            humidity_warning: 50
        }
    ]
}