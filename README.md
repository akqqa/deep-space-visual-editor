# Deep Space Visual Editor

A 3D Modelling program based on the game "The Message from Deep Space". Try it [here!](https://dsve.akqqa.dev)

<img width="2557" height="1268" alt="image" src="https://github.com/user-attachments/assets/05d3fadc-65c6-4416-8835-fe2094eec827" />

*"Solar System" model created by Konstans*

## Instructions:

To use this software, you have to have a dictionary save from the game with at least up to signal -53 defined.

If you have not played the game but still want to try the program, please use DICTIONARY-1.save in this repo. Drag the file into the site to start.

Models are made out of a collection of spheres - with transformable radius and colour.

Models can be imported and exported as strings - which are compatible with the [Deep Space Transmission Relay](https://github.com/dixonary/mfds-server).

## Current Features

- Creation and deletion of spheres
- Movement up to a resolution of 0.1 units
- Changing volume and colour
- Duplication
- Undo/Redo change history
- Full camera movement
- Group selection/deselection with either clicking or dragging over desired spheres
- Group movement with custom rotational/mirror operations
- Importing/Exporting as raw signal or dictionary defined strings
- Signal counter to keep track of message length
- Download as a .GLB file

## Planned Features

- Even more game-accurate fresnel shading
- A curated gallery to share models that can be viewed by other users

## Credits:

Thank you to Dixonary for the base website template and logic used for the translation and dictionary!

Thanks to ElNico for loads of help fiddling with the color palette, writing custom code for it and helping me debug my shoddy code.

And thanks to applesinmypants for taking the time to help us get the colours accurate.
