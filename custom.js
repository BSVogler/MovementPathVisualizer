scene = document.querySelector('a-scene');
scaling = 20;
sceneOffset = new THREE.Vector3(1,1,0);
showSpeed = false;
showDir = false;
currentAnimStep=0;
//last added replay
listOfDPs = new Array();
	
//document.getElementById("cursoranim").addEventListener("animationbegin", function(){ alert("Hello World!"); });
//register animation end to add new position
document.getElementById("cursor").addEventListener("animationend", nextAnimationStep);

function Datapoint(){
	this.timestamp = 0.0; //time in ms
	this.position = new THREE.Vector3();//in m(?)
	this.rotation = new THREE.Quaternion();//in m(?)
	this.distanceToNext = Number.POSITIVE_INFINITY;
}

var coordinates = AFRAME.utils.coordinates;
AFRAME.registerComponent('line', {
  // Allow line component to accept vertices and color.
	schema: {
	  color: { default: '#333333' },
	  path: {
	    default: [
	      { x: -0.5, y: 0, z: 0 },
	      { x: 0.5, y: 0, z: 0 }
	    ],
	    // Deserialize path in the form of comma-separated vec3s: `0 0 0, 1 1 1, 2 0 3`.
	    parse: function (value) {
			 return value.map(coordinates.parse);//removed split(",") because object creation does fail if set via setattribute 
	    },
	    // Serialize array of vec3s in case someone does
	    // setAttribute('line', 'path', [...]).
	    stringify: function (data) {
	      return data.map(coordinates.stringify).join(',');
	    }
	  }
	},
	
  // Create or update the line geometry.
	update: function (oldData) {
	  // Set color with material.
	  var material = new THREE.LineBasicMaterial({
	    color: this.data.color,
	    transparent : true,
	    opacity: 0.6
	  });
	  // Add vertices to geometry.
	  var geometry = new THREE.Geometry();
	  this.data.path.forEach(function (vec3) {
	    geometry.vertices.push(
	      new THREE.Vector3(vec3.x, vec3.y, vec3.z)
	    );
	  });
	  // Apply mesh.
	  this.el.setObject3D('mesh', new THREE.Line(geometry, material));
	},

	remove: function () {
	  this.el.removeObject3D('mesh');
	}
});

AFRAME.registerComponent('segmentline', {
  // Allow line component to accept vertices and color.
	schema: {
	  color: {
	  	default : ['#333333'],
	  },

	  path: {
	    default: [
	      { x: -0.5, y: 0, z: 0 },
	      { x: 0.5, y: 0, z: 0 }
	    ],
	    // Deserialize path in the form of comma-separated vec3s: `0 0 0, 1 1 1, 2 0 3`.
	    parse: function (value) {
			 return value.map(coordinates.parse);//removed split(",") because object creation does fail if set via setattribute 
	    },
	    // Serialize array of vec3s in case someone does
	    // setAttribute('line', 'path', [...]).
	    stringify: function (data) {
	      return data.map(coordinates.stringify).join(',');
	    }
	  }
	},
	
  // Create or update the line geometry.
	update: function (oldData) {
		var group = new THREE.Object3D();//create an empty container
	  	for (i=0;i<this.data.path.length-1;i++) {
	  		var geometry = new THREE.Geometry();
	  		geometry.vertices.push( new THREE.Vector3(this.data.path[i].x, this.data.path[i].y, this.data.path[i].z));
	  		geometry.vertices.push( new THREE.Vector3(this.data.path[i+1].x, this.data.path[i+1].y, this.data.path[i+1].z));

			group.add( new THREE.Line(geometry, new THREE.LineBasicMaterial({
	    		color: this.data.color[i],
	    		transparent : true,
	    		opacity: 1.0
	  		})) );//add a mesh with geometry to it
		
	  	}
	  this.el.setObject3D('mesh', group);
	},

	remove: function () {
	  this.el.removeObject3D('mesh');
	}
});

/*
	Adds the left and right target to scene.	
*/
function addTargetsToDOM(){
	//add left target
	var matrix = new THREE.Matrix4();
	matrix.set(0.001, 0.000, 0.000, -0.175,0.000, 0.001, 0.000, 0.000,0.000, 0.000, 0.001, 0.000,0.000, 0.000, 0.000, 1.000);
	var position = new THREE.Vector3();
	var quaternion = new THREE.Quaternion();
	var scale = new THREE.Vector3();

	matrix.decompose( position, quaternion, scale );
	position.multiplyScalar(scaling);

	position.add(sceneOffset);
	var targetL = document.createElement("a-sphere");
	targetL.setAttribute("position",position);
	targetL.setAttribute("radius",0.03)
	
	scene.appendChild(targetL);
	
	//add right target
	matrix = new THREE.Matrix4();
	matrix.set(0.001, 0.000, 0.000, 0.175,0.000, 0.001, 0.000, 0.000,0.000, 0.000, 0.001, 0.000,0.000, 0.000, 0.000, 1.000);

	position = new THREE.Vector3();
	quaternion = new THREE.Quaternion();
	scale = new THREE.Vector3();
	matrix.decompose( position, quaternion, scale );
	position.multiplyScalar(scaling);

	position.add(sceneOffset);
	var targetR = document.createElement("a-sphere");
	targetR.setAttribute("position",position);
	targetR.setAttribute("radius",0.03)
	
	scene.appendChild(targetR);
	
}

/*
	adds one trial of one user to the DOM for the A-Frame framework
	taskID: the id of the task (1-4)
	trialId: user id
	color: color of line
*/
function addTrialToDOM(pathToReplay, taskId, trialId, color) {
	//start reading file
	var linesOfDataFile ="";
	var rawFile = new XMLHttpRequest();
	rawFile.open("GET", pathToReplay, false);
	rawFile.onreadystatechange = function (){
	    if(rawFile.readyState === 4 && (rawFile.status === 200 || rawFile.status == 0)){
			parseText(taskId, trialId, color, rawFile.responseText)
	    }
	}
	rawFile.send(null);
}

//when file is loaded, parse it
function parseText(taskId, trialId, color, text) {
	lines = text.split('\n');
	listOfDPs = [];//clear list of datapoints because we will get a new one
	
	var lastDP = null;
	var maxDistance = 0;
	var maxDt = 0;
	var maxDv = 0;

	var newFormat = false;
	var duplicatesCount = 0;
	var scaleDump = new THREE.Vector3();//dump values
	for (var i = 0; i < lines.length; i++) {
		//check if new format
		if (i==0 && lines[0].startsWith("taskSet")) {
			i += 1;
			newFormat = true;
			console.log("using new format");
		}
		
		//create new datapoint with timestamp and matrix
		if (newFormat || lines[i].startsWith("t:")) {
			dp = new Datapoint();
			
			if (!newFormat) {
				dp.timestamp = parseFloat(lines[i].substring(2, lines[i].length));
				i += 1; //skip next line
				var matrix = new THREE.Matrix4();
				var splitted = lines[i].split(' ');
				var j = 0;
				//row major, fromArray() is column-major
				matrix.set(
					parseFloat(splitted[j++]),
					parseFloat(splitted[j++]),
					parseFloat(splitted[j++]),
					parseFloat(splitted[j++]),
					parseFloat(splitted[j++]),
					parseFloat(splitted[j++]),
					parseFloat(splitted[j++]),
					parseFloat(splitted[j++]),
					parseFloat(splitted[j++]),
					parseFloat(splitted[j++]),
					parseFloat(splitted[j++]),
					parseFloat(splitted[j++]),
					parseFloat(splitted[j++]),
					parseFloat(splitted[j++]),
					parseFloat(splitted[j++]),
					parseFloat(splitted[j++])
				);

				//var quaternion = new THREE.Quaternion();
				matrix.decompose( dp.position, dp.rotation, scaleDump );
			} else {
				var splitted = lines[i].split(',');
				dp.timestamp = parseFloat(splitted[2]);
				dp.position.x = parseFloat(splitted[3]);
				dp.position.y = parseFloat(splitted[4]);
				dp.position.z = parseFloat(splitted[5]);
				dp.rotation.x = parseFloat(splitted[6]);
				dp.rotation.y = parseFloat(splitted[7]);
				dp.rotation.z = parseFloat(splitted[8]);
				dp.rotation.w = parseFloat(splitted[9]);
			}
			
			//dp.position = new THREE.Vector3(1, 1, 1).applyMatrix4(matrix);
			//dp.rotation = new THREE.Quaternion().setFromRotationMatrix(matrix.extractRotation());
			//shift data to view, then add to path
			//dp.position.applyQuaternion(quaternion);
			dp.position.multiplyScalar(scaling);
			dp.position.add(sceneOffset);

			//current one is duplicate
			if (listOfDPs.length > 0 && dp.position.equals(listOfDPs[listOfDPs.length-1].position) && dp.rotation.equals(listOfDPs[listOfDPs.length-1].rotation))  {
				duplicatesCount++;
				//current one is the last one
				listOfDPs[listOfDPs.length-1].timestamp = dp.timestamp;//refrehs timestamp to last know timestamp at this pos
				dp = listOfDPs[listOfDPs.length-1];
			} else {
				listOfDPs.push(dp);
			}
			
			//calcualte distance of last DP to the current one
			if (showSpeed && lastDP != null) {
				lastDP.distanceToNext = lastDP.position.distanceTo(dp.position);
				var dt = dp.timestamp - lastDP.timestamp;
				var dv = lastDP.distanceToNext / dt;
				if (lastDP.distanceToNext > maxDistance)
					maxDistance = lastDP.distanceToNext;
				if (dt > maxDt)
					maxDt = dt;
				if (dv > maxDv)
					maxDv = dv;
			}
			lastDP = dp;
			
		}
	}

	console.log("Done parsing to "+ listOfDPs.length + " elements. Max dv:"+maxDv+" maxDistance: "+maxDistance+" max dt: "+ maxDt+"s. Removed "+duplicatesCount+" duplicate points.");
	
	//add to one DOM object
	var lineDOMObject = document.createElement("a-entity");
	lineDOMObject.setAttribute("class",taskId+"-"+trialId);
	var path = [];
	
	if (!showSpeed){
		lineDOMObject.setAttribute("line", "path", path);
		lineDOMObject.setAttribute("line","color", color)
	} else {
		lineDOMObject.setAttribute("segmentline", "path", path);
		color = [];
		lineDOMObject.setAttribute("segmentline","color", color)
	}
	
	var up = new THREE.Vector3(0,1,0);
	
	//add every position value
	for (var i = 0; i < listOfDPs.length; i++) {
		//if option for delta speed is enabled show with color
		if (showSpeed && maxDv > 0 && i < listOfDPs.length-1) {
			var dt = listOfDPs[i+1].timestamp - listOfDPs[i].timestamp;//time
			var dv = listOfDPs[i].distanceToNext / dt;//velocity
			var hexBrightness = (parseInt(255*dv / maxDv)).toString(16);
			if (hexBrightness.length == 1)//avoid invalid color
				hexBrightness="0".concat(hexBrightness);
			//make red if above 80% of max speed
			var redfilter=hexBrightness.concat(hexBrightness);
			if (dt > 2*maxDt / 5){
				redfilter = "0000";
			}
			
			color.push("#".concat(hexBrightness).concat(redfilter));
		}
		path.push(listOfDPs[i].position);

		//add cones for direction
		if (showDir && i % 3 == 0 && i < listOfDPs.length-1) { //skip some elements
			//add cone for direction
			var cone = document.createElement("a-cone");
			//cone.setAttribute("geometry","primitive","cone");
			cone.setAttribute("class", taskId+"-"+trialId)
			cone.setAttribute("color", color);
			cone.setAttribute("radius-bottom", 0.008);
			cone.setAttribute("radius-top", 0);
			cone.setAttribute("open-ended", false);
			cone.setAttribute("geometry", "segmentsRadial", 4);
			cone.setAttribute("geometry", "segmentsHeight", 4);
			cone.setAttribute("height", 0.04);
			cone.setAttribute("position", listOfDPs[i].position);

			var norm = new THREE.Vector3().copy(listOfDPs[i + 1].position).sub(listOfDPs[i].position).normalize();
			var euler = new THREE.Euler(0, 0, 0, 'XYZ');
			euler.setFromQuaternion(new THREE.Quaternion().setFromUnitVectors ( up, norm));
	
			cone.setAttribute("rotation", (euler.x * 180 / Math.PI) + " " + (euler.y * 180 / Math.PI) + " "+ (euler.z * 180 / Math.PI));
			scene.appendChild(cone);
		}
	}
	
	scene.appendChild(lineDOMObject);
	

	console.log("Done adding to DOM.");
	currentAnimStep=0;
	nextAnimationStep();
}

function nextAnimationStep(){

	if (listOfDPs.length>0) {
		//has more animation steps
		currentAnimStep += 1;
		currentAnimStep %= listOfDPs.length-1;

		//remove last animation
		var cursorNode = document.getElementById("cursor");
		while (cursorNode.hasChildNodes()) {
			cursorNode.removeChild(cursorNode.lastChild);
		}

		var dur = listOfDPs[currentAnimStep+1].timestamp - listOfDPs[currentAnimStep].timestamp;

		var from = AFRAME.utils.coordinates.stringify(listOfDPs[currentAnimStep].position);
		var to = AFRAME.utils.coordinates.stringify(listOfDPs[currentAnimStep+1].position);
		if (from != to) {
			var anim = document.createElement("a-animation");
			anim.setAttribute("attribute", "position");
			anim.setAttribute("from", from);
			anim.setAttribute("to", to);
			anim.setAttribute("dur", dur);
			cursorNode.appendChild(anim);
		}

		var euler1=new THREE.Euler(0,0,0, 'XYZ' ).setFromQuaternion(listOfDPs[currentAnimStep].rotation);
		var euler2 = new THREE.Euler(0,0,0, 'XYZ' ).setFromQuaternion(listOfDPs[currentAnimStep+1].rotation);

		if (!euler1.equals(euler2)) {
			var anim = document.createElement("a-animation");
			anim.setAttribute("attribute", "rotation");
			anim.setAttribute("from", (euler1.x * 180 / Math.PI) + " " + (euler1.y * 180 / Math.PI) + " "+ (euler1.z * 180 / Math.PI));
			anim.setAttribute("to", (euler2.x * 180 / Math.PI) + " " + (euler2.y * 180 / Math.PI) + " "+ (euler2.z * 180 / Math.PI));
			anim.setAttribute("dur", dur);
			cursorNode.appendChild(anim);
		}
	}
	
}

addTargetsToDOM();