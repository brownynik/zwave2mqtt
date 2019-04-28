#!/bin/sh
#!/usr/bin/env node
pm2 start /home/pi/user-scripts/zwave2mqtt.js --name zwave2mqtt-en -i 1 --node-args="" -- --zwaveport=/dev/ttyUSB-ZStick --out=zwavectrl-en/out --in=zwavectrl-en/in
pm2 start /home/pi/user-scripts/zwave2mqtt.js --name zwave2mqtt-ru -i 1 --node-args="" -- --zwaveport=/dev/ttyUSB-ZStickRU --out=zwavectrl-ru/out --in=zwavectrl-ru/in
