'use strict';
importScripts('pgse-engine.js');
self.onmessage=e=>{try{self.postMessage({result:simulate(e.data)});}catch(error){self.postMessage({error:error.message});}};
