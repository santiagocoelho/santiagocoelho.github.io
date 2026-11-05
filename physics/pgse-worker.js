'use strict';
importScripts('pgse-engine.js?v=20261105-gradient-arrow');
self.onmessage=e=>{try{self.postMessage({result:simulate(e.data,{visible:240})});}catch(error){self.postMessage({error:error.message});}};
