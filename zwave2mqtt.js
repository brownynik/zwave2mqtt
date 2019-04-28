//'use strict'
const minimist = require('/home/pi/.node-red/node_modules/minimist');
//var ZWave = require('./lib/openzwave-shared.js');
var ZWave = require('/home/pi/.node-red/node_modules/openzwave-shared/lib/openzwave-shared.js');

var zwave = new ZWave({
  ConsoleOutput: false
});

var zwavedriverpaths = '/dev/ttyUSB0';
var mqttouttopic = 'zwavectrl-en/out' ;
var mqttintopic = 'zwavectrl-en/in' ;

var mqtt = require('/usr/bin/mqtt');
var mqttclient = null;

var mqttoptions = {
	port: 1883,
	host: '192.168.1.10',
	clientId: 'zwavectrl-homeid',
	username: 'mqttlogin',
	password: 'mqttpassword'
}

function sendMqttNotify(msgtopic, message) {
	
	if ((mqttclient!==null)&&(mqttclient.connected)) {
		mqttclient.publish(msgtopic, message);
		strTimestamp = "[" + (new Date()).toISOString().replace("T"," ").split("Z")[0] + "] ";
		console.log(strTimestamp + "Success push message: %s", message.toString())
	}
};

function prepareMqttMessage(msgtopic, message) {

	// {"msgtype":"setvalue", "data":{"nodeid":16, "cmdclass": 64, "cmdidx": 0, "instance": 1, "class_id": 64, "oldState": "Off", "currState": "Heat","label": "Mode", "value": "Heat"}}
	// {"msgtype":"healnetworknode", "data":{"nodeid":16, "doreturnroutes": false}}
	
	var zwcommand = JSON.parse(message.toString());
	
	strTimestamp = "[" + (new Date()).toISOString().replace("T"," ").split("Z")[0] + "] ";

	console.log(strTimestamp + 'Recive MQTT: %s', message.toString());
	
	if (zwcommand.msgtype) {
			
		
		if ((zwcommand.msgtype == "setvalue")&&(zwcommand.data)) {

			var payload = zwcommand.data;
			
			zwave.setValue(
				payload.nodeid, (payload.cmdclass || 37), // default cmdclass: on-off
				(payload.instance || 1), // default instance
				(payload.cmdidx || 0), // default cmd index
				payload.value
			  );
		} else
		if ((zwcommand.msgtype == "healnetworknode")&&(zwcommand.data)) {

			var payload = zwcommand.data;
			zwave.healNetworkNode(payload.nodeid, payload.doreturnroutes);
		}
		if ((zwcommand.msgtype == "refreshnodeinfo")&&(zwcommand.data)) {

			var payload = zwcommand.data;
			zwave.refreshNodeInfo(payload.nodeid);
		}
		if (zwcommand.msgtype == "healnetwork") {

			zwave.healNetwork();
		}
		
	}
	
};


var nodes = [];
var homeid = null;

zwave.on('driver ready', function(home_id) {
  homeid = home_id;
  console.log('scanning homeid=0x%s...', homeid.toString(16));



  mqttoptions.clientId = 'zwavectrl-' + homeid.toString(16);

  console.log(mqttoptions.username);
  console.log(mqttoptions.password);
  console.log(mqttouttopic);
  console.log(mqttintopic);
 // process.exit();
  


  mqttclient = mqtt.connect(mqttoptions);


  mqttclient.on('message', prepareMqttMessage);
  
  mqttclient.on('connect', () => {
		mqttclient.subscribe(mqttintopic);
		mqttclient.publish(mqttouttopic, mqttoptions.clientId + ' connected'); 
  });
 
  
});





zwave.on('driver failed', function() {
  console.log('failed to start driver');
  zwave.disconnect();
  
  if ((mqttclient!==null)&&(mqttclient.connected)) { 
	mqttclient.end(); 
  }
  
  process.exit();
});

zwave.on('node added', function(nodeid) {
  nodes[nodeid] = {
    manufacturer: '',
    manufacturerid: '',
    product: '',
    producttype: '',
    productid: '',
    type: '',
    name: '',
    loc: '',
    classes: {},
    ready: false,
  };
});

zwave.on('node event', function(nodeid, data) {
  console.log('node%d event: Basic set %d', nodeid, data);
});

zwave.on('value added', function(nodeid, comclass, value) {
  if (!nodes[nodeid]['classes'][comclass])
    nodes[nodeid]['classes'][comclass] = {};
  nodes[nodeid]['classes'][comclass][value.index] = value;
});

zwave.on('value changed', function(nodeid, comclass, value) {


  if (nodes[nodeid]['ready']) {
    strTimestamp = "[" + (new Date()).toISOString().replace("T"," ").split("Z")[0] + "] ";
    console.log(strTimestamp + 'node%d: changed: %d:%s:%s->%s', nodeid, comclass,
      value['label'],
      nodes[nodeid]['classes'][comclass][value.index]['value'],
      value['value']);
	 
	/*
	var mqttmsg = {
		msgtype: "value changed",
		nodeid: nodeid,
		comclass: comclass,
		value: value
	};
	
	
	// sendMqttNotify(mqttouttopic, JSON.stringify(mqttmsg));
	sendMqttNotify(mqttouttopic, JSON.stringify(value));

	var mqttmsg = {
		protocol: "zwave",
		nodeid: nodeid,
		command: value['label'],
		value: value['value']
	};
	*/

	sendMqttNotify(mqttouttopic, JSON.stringify(value));
	
//	{"value_id":"16-67-1-1","node_id":16,"class_id":67,"type":"decimal","genre":"config","instance":1,"index":1,"label":"ComfortSetpoint","units":"C","help":"","read_only":false,"write_only":false,"min":0,"max":0,"is_polled":false,"value":"21.0"}
	
	
	
	  
  }
  nodes[nodeid]['classes'][comclass][value.index] = value;
});

zwave.on('value removed', function(nodeid, comclass, index) {
  if (nodes[nodeid]['classes'][comclass] &&
    nodes[nodeid]['classes'][comclass][index])
    delete nodes[nodeid]['classes'][comclass][index];
});

zwave.on('node ready', function(nodeid, nodeinfo) {
  nodes[nodeid]['manufacturer'] = nodeinfo.manufacturer;
  nodes[nodeid]['manufacturerid'] = nodeinfo.manufacturerid;
  nodes[nodeid]['product'] = nodeinfo.product;
  nodes[nodeid]['producttype'] = nodeinfo.producttype;
  nodes[nodeid]['productid'] = nodeinfo.productid;
  nodes[nodeid]['type'] = nodeinfo.type;
  nodes[nodeid]['name'] = nodeinfo.name;
  nodes[nodeid]['loc'] = nodeinfo.loc;
  nodes[nodeid]['ready'] = true;
  console.log('node%d: %s, %s', nodeid,
    nodeinfo.manufacturer ? nodeinfo.manufacturer : 'id=' + nodeinfo.manufacturerid,
    nodeinfo.product ? nodeinfo.product : 'product=' + nodeinfo.productid +
    ', type=' + nodeinfo.producttype);
  console.log('node%d: name="%s", type="%s", location="%s"', nodeid,
    nodeinfo.name,
    nodeinfo.type,
    nodeinfo.loc);
  for (comclass in nodes[nodeid]['classes']) {
    switch (comclass) {
      case 0x25: // COMMAND_CLASS_SWITCH_BINARY
      case 0x26: // COMMAND_CLASS_SWITCH_MULTILEVEL
        zwave.enablePoll(nodeid, comclass);
        break;
    }
    var values = nodes[nodeid]['classes'][comclass];
    console.log('node%d: class %d', nodeid, comclass);
    for (idx in values)
      console.log('node%d:   %s=%s', nodeid, values[idx]['label'], values[
        idx]['value']);
  }

});

zwave.on('notification', function(nodeid, notif) {

  strTimestamp = "[" + (new Date()).toISOString().replace("T"," ").split("Z")[0] + "] ";

  switch (notif) {
    case 0:
      console.log(strTimestamp +'node%d: message complete', nodeid);
      break;
    case 1:
      console.log(strTimestamp +'node%d: timeout', nodeid);
      break;
    case 2:
      console.log(strTimestamp +'node%d: nop', nodeid);
      break;
    case 3:
      console.log(strTimestamp +'node%d: node awake', nodeid);
      break;
    case 4:
      console.log(strTimestamp +'node%d: node sleep', nodeid);
      break;
    case 5:
      console.log(strTimestamp +'node%d: node dead', nodeid);
      break;
    case 6:
      console.log(strTimestamp +'node%d: node alive', nodeid);
      break;
  }
});

zwave.on('scan complete', function() {
  console.log('====> scan complete');
  zwave.requestAllConfigParams(3);
});

zwave.on('controller command', function(n, rv, st, msg) {
  console.log(
    'controller commmand feedback: %s node==%d, retval=%d, state=%d', msg,
    n, rv, st);
});

const args = minimist(process.argv.slice(2), {
  alias: {
	'help': 'h',
	'zwaveport':'zwport',
	'mqtthost':'host',
	'mqttport':'port',
	'mqttuser':'user',
	'mqttpassword':'pass',
	'mqttintopic':'in',
	'mqttouttopic':'out',
  },
  
  default: 
  {	
	'help': true,
	'zwaveport':'/dev/ttyUSB-ZStick',
	'mqtthost':'192.168.1.10',
	'mqttport':1883,
	'mqttuser':'mqttlogin',
	'mqttpassword':'mqttpassword',
	'mqttintopic':'zwavectrl-en/in',
	'mqttouttopic':'zwavectrl-en/out',
  },
  unknown: (arg) => {
    console.error('Unknown option: ', arg);
	process.exit();
  }
});

zwavedriverpaths = args.zwaveport;

mqttouttopic = args.mqttouttopic;
mqttintopic = args.mqttintopic;
mqttoptions.host = args.mqtthost;
mqttoptions.port = args.mqttport;
mqttoptions.username = args.mqttuser;
mqttoptions.password = args.mqttpassword;

console.log('arguments:', args);
console.log(mqttouttopic);
//process.exit();


console.log("connecting to " + zwavedriverpaths);
zwave.connect(zwavedriverpaths);

process.on('SIGINT', function() {
  console.log('disconnecting...');
  zwave.disconnect(zwavedriverpaths);

  if ((mqttclient!==null)&&(mqttclient.connected)) { 
	mqttclient.end(); 
  }

  process.exit();
});
