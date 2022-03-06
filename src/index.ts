import { client } from './mqtt/clientMqtt';
import { app } from './express/expressApi';
import moment from 'moment';

const mqtt = async () => client;
const express = async () => app;
mqtt();
express();
