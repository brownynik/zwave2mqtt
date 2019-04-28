#!/bin/sh
#!/usr/bin/env node
pm2 stop zwave2mqtt-ru
pm2 stop zwave2mqtt-en
pm2 start zwave2mqtt-ru
pm2 start zwave2mqtt-en
