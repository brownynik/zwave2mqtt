#!/bin/sh
#!/usr/bin/env node
#node /home/pi/user-scripts/zwave2mqtt-en.js --zwaveport=/dev/ttyUSB-ZStick --in=zwavectrl-en/in --out=zwavectrl-en/out
#node --version
#pm2 start /home/pi/user-scripts/zwave2mqtt.js --name zwave2mqtt-en --node-args="--zwaveport=/dev/ttyUSB-ZStick --in=zwavectrl-en/in --out=zwavectrl-en/out"
#pm2 start --name zwave2mqtt-en /home/pi/user-scripts/zwave2mqtt.js - node-args="dev --zwaveport=/dev/ttyUSB-ZStick --in=zwavectrl-en/in --out=zwavectrl-en/out"

pm2 start /home/pi/user-scripts/zwave2mqtt.js --name zwave2mqtt-ru -i 1 --max-memory-restart 104857600 --node-args="" -- --zwaveport=/dev/ttyUSB-ZStickRU --out=zwavectrl-ru/out --in=zwavectrl-ru/in
