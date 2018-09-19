# MovementPathVisualizer
Tool to visualize movement path+timestamp data using framework [A-Frame](https://github.com/aframevr/aframe).

This version uses a-frame version 0.8. Versions newer than 0.7 breaks the line rendering of path.The problem is that extending a component has changed.

A sample data file is `2_trial0.replay`

![Screenshot](screenshot1.png)
![Screenshot](screenshot2.png)

To have file access start a webserver in the directory e.g. with 
```python -m SimpleHTTPServer``` or ```python3 -m http.server```
