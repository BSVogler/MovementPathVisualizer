scene = document.querySelector('a-scene');
scaling = 20;
sceneOffset = new THREE.Vector3(1,1,0);
showSpeed = false;


//todo
//1. control the data via gui
//3. legende für die Farben
//4. implement rotation

function Datapoint(){
	this.timestamp = 0.0;
	this.position = new THREE.Vector3();
	this.distanceToNext = Number.POSITIVE_INFINITY;
}

var coordinates = AFRAME.utils.coordinates;
AFRAME.registerComponent('line', {
  // Allow line component to accept vertices and color.
	schema: {
	  color: { default: '#333' },
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
	    color: this.data.color
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
function addTrialToDOM(taskID, trialId, color) {

	//when file is loaded, parse it
	function finishedLoading(text) {
		lines = text.split('\n');
		var lastDP = null;
		var maxDistance = 0;
		var maxDt = 0;
		var maxDv = 0;

		var duplicatesCount = 0;
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			if (line.startsWith("t:")) {
				//create new datapoint with timestamp and matrix
				dp = new Datapoint();
				dp.timestamp = parseFloat(line.substring(2, line.length));
				i += 1; //skip next line
				var matrix = new THREE.Matrix4();
				matrix.set(
					parseFloat(lines[i].substring(1, 6)),
					parseFloat(lines[i].substring(7, 12)),
					parseFloat(lines[i].substring(13, 18)),
					parseFloat(lines[i].substring(19, 24)),
					parseFloat(lines[i + 1].substring(1, 6)),
					parseFloat(lines[i + 1].substring(7, 12)),
					parseFloat(lines[i + 1].substring(13, 18)),
					parseFloat(lines[i + 1].substring(19, 24)),
					parseFloat(lines[i + 2].substring(1, 6)),
					parseFloat(lines[i + 2].substring(7, 12)),
					parseFloat(lines[i + 2].substring(13, 18)),
					parseFloat(lines[i + 2].substring(19, 24)),
					parseFloat(lines[i + 3].substring(1, 6)),
					parseFloat(lines[i + 3].substring(7, 12)),
					parseFloat(lines[i + 3].substring(13, 18)),
					parseFloat(lines[i + 3].substring(19, 24))
				);


				//var quaternion = new THREE.Quaternion();
				//var scale = new THREE.Vector3();
				//matrix.decompose( dp.position, quaternion, scale );

				dp.position = new THREE.Vector3(1, 1, 1).applyMatrix4(matrix);
				//shift data to view, then add to path
				//dp.position.applyQuaternion(quaternion);
				dp.position.multiplyScalar(scaling);
				dp.position.add(sceneOffset);

				//current one is duplicate
				if (listOfDPs.length > 0 && dp.position.equals(listOfDPs[listOfDPs.length-1].position))  {
					duplicatesCount++;
					//current one is the last one
					listOfDPs[listOfDPs.length-1].timestamp = dp.timestamp;//refrehs timestap to last know timestamp at this pos
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
					

				i += 4; //skip rest
			}
		}

		console.log("done parsing to "+ listOfDPs.length + " elements. Max delta v:"+maxDv+" maxDistance: "+maxDistance+" max delta t: "+ maxDt+"s. Removed "+duplicatesCount+" duplicate points.");
		
		
		//add to DOM
		if (showSpeed){
			//add cone for direction
			var cone = document.createElement("a-cone");
			cone.setAttribute("color","color");
			cone.setAttribute("radius-bottom","2");
			cone.setAttribute("radius-top","0.1");
			cone.setAttribute("position","0 1 1");
			//cone.setAttribute("radius-top","0.1");
			scene.appendChild(cone);
			
			//add line segments
			for (var i = 1;i < listOfDPs.length;i++){
				//only add non-duplicatesCount					
				var lineset = document.createElement("a-entity");
				//var hexBrightness = new Buffer(1/distance, 'hex')[0];
				var dt = listOfDPs[i].timestamp - listOfDPs[i-1].timestamp;
				var dv = listOfDPs[i].distanceToNext/dt;
				if (dv > 0){
					var hexBrightness = (parseInt(255*dv/maxDv)).toString(16);
					lineset.setAttribute("line","color:#"+hexBrightness+hexBrightness+hexBrightness+";");
				}
				if (dt > maxDt/3){
					//var hexBrightness = (parseInt(255*dv/maxDv)).toString(16);
					lineset.setAttribute("line","color:#ff0000;");
				}
			
				var path = new Array();
			
				path.push(listOfDPs[i-1].position);
				path.push(listOfDPs[i].position);

				lineset.setAttribute("line", "path", path);
				scene.appendChild(lineset);
			}
		} else {
			//add one big line
			var lineDOMObject = document.createElement("a-entity");
			lineDOMObject.setAttribute("line","color:"+color+";")
			var path = new Array();
			
			//shift data to view, then add to path
			for (var i = 0; i < listOfDPs.length; i++) {
				if (i % 3 == 0) { //skip some elements
					//add cone for direction
					var cone = document.createElement("a-cone");
					//cone.setAttribute("geometry","primitive","cone");
					cone.setAttribute("color", color);
					cone.setAttribute("radius-bottom", 0.008);
					cone.setAttribute("radius-top", 0);
					cone.setAttribute("open-ended", false);
					cone.setAttribute("geometry", "segmentsRadial", 4);
					cone.setAttribute("geometry", "segmentsHeight", 4);
					cone.setAttribute("height", 0.04);
					cone.setAttribute("position", listOfDPs[i].position);

					var up = new THREE.Vector3(0,1,0);
					var norm = new THREE.Vector3().copy(listOfDPs[i + 1].position).sub(listOfDPs[i].position).normalize();
					//var norm = new THREE.Vector3(1,1,0).normalize();
					var euler = new THREE.Euler(0, 0, 0, 'XYZ');
					euler.setFromQuaternion(new THREE.Quaternion().setFromUnitVectors ( up, norm));
					

					cone.setAttribute("rotation", (euler.x * 180 / Math.PI) + " " + (euler.y * 180 / Math.PI) + " "+ (euler.z * 180 / Math.PI));
					scene.appendChild(cone);
				}
				path.push(listOfDPs[i].position);
			}

			lineDOMObject.setAttribute("line", "path", path);
			scene.appendChild(lineDOMObject);	
		}
		console.log("Done adding to DOM.");
	}
	

	//start reading file
	var listOfDPs = new Array();
	var pathToReplay = "/data/"+taskID+"_trial"+trialId+".replay";
	var linesOfDataFile ="";
	var rawFile = new XMLHttpRequest();
	rawFile.open("GET", pathToReplay, false);
	rawFile.onreadystatechange = function (){
	    if(rawFile.readyState === 4 && (rawFile.status === 200 || rawFile.status == 0)){
			finishedLoading(rawFile.responseText)
	    }
	}
	rawFile.send(null);
}

addTargetsToDOM();