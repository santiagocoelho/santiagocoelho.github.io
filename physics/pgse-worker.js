'use strict';
importScripts('pgse-engine.js?v=20261105-motion-zoom');
self.onmessage=e=>{try{self.postMessage({result:simulate(e.data)});}catch(error){self.postMessage({error:error.message});}};
