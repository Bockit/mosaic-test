IMPORTANT
=========

Because I'm using a bundler to create the javascript, if you want to tweak the javascript you'll need to do extra steps to setup and run. You'll need to install the dependencies:

`npm install`

And then to see any changes you make in the frontend, you'll want to rebundle.

`npm run watch`

Which will start a watcher ([watchify][watchify]) to update `js/bundle.js`. You start the server as before:

`npm start`

Then visit http://127.0.0.1:8765

[watchify]: https://npmjs.com/watchify


Test Notes
----------

* I swapped to a watchify bundler instead of n js files.
    - `npm install` first, then `npm run watch` each time
    - At the end I commited the bundle.js file to the repo so you can still easily run with `./start.sh`
* I added a css endpoint to the server
* The requirements said testable, I'm not sure if that means you don't want me to write tests or not so I've included some as examples. `npm test`. They're not near exhaustive, I would need more time to set up mocks and a test runner for the browser. I hope you can see my plan for testing ([tape][tape], and I'd add [proxyquireify][pqfy] to mock required moduels). I usually use [zuul][zuul] to run them in the browser.
* Total time was 4 hours, but I spent 50~ minutes looking into file drag and drop because I had a free morning and I hadn't done it before :) Turns out there were a couple of gotchas
* Some improvements I would make if I had more time and the problems they solve were deemed worth it:
    - I have a feeling the execute function which runs all the image loading tasks could be better adapted to the browser's environment. I.e., at the moment it tries to load all images at once and draws the rows as they come down. In practice for me the rows still came down in about the rendering order but I wonder if fetching 1 row at a time would yield improvements of time. I would need to benchmark it. Also it could probably be an
    event emitter instead of a function taking a callback from an API improvement standpoint.
    - Tasks with the same colour value should only cause 1 fetch. Promises + memoization would probably be an easy win here.
    - The browser freezes a little on big images as I read pixel data. There are a couple of approaches I would take here if it was deemed a problem. In all cases I would benchmark.
        1. For smaller images where it would be ok to load the whole thing into memory it might be faster to call getImageData() once and throw it into a webworker.
        2. For larger images I would try either breaking into smaller regions and then following 1.
        3. In both cases, applying a game loop style solution, where it checks how much time has been spent between calculations and if it needs to allow another tick before continuing would prevent freezing the ui and I could display a loading icon.
* Finally, I couldn't find a public canva styleguide so I just went with my normal style (excluding when I made changes to the server and settings file). I'm not fussed on what the styleguide is, so please don't take my exclusion of semicolons as an unwillingness to use them :)

[tape]: https://npmjs.com/tape
[pqfy]: https://www.npmjs.com/proxyquireify
[zuul]: https://npmjs.com/zuul

Revisit
-------

I came back on Sunday to implement what I thought were some easy optimisation wins. Time spent was 35 minutes.

1. I moved loading an image url onto a canvas into its own module and memoized it. This means a single colour tile is only ever fetched once. I was originally going to measure the effects but since it had the side-effect of subsequent mosaics of the same image being instant I figured that was worth what didn't seem like much of a change in my test images.
2. I refactored the tile task generation to only call pixel data once per mosaic, rather than once per tile in the mosaic. Just a quick console.time gave me these results:
    - Small image multiple calls: 939.445ms
    - Large image multiple calls: 5032.352ms
    - Small image one call: 298.791ms
    - Large image one call: 2873.216ms

    Worth keeping! Also, with this change I could drop the idea of a game loop to read from the canvas and process the whole dataset in a webworker.

I stopped there because I didn't want to go too far over the limit of three hours, but my next step would be to refactor execute to be an EventEmitter so I could then handle errors (I'm not, yet) and the API for it wouldn't be so weird.
