import { analyze } from './engine.mjs';
self.onmessage = ({data}) => {
  try { self.postMessage({result:analyze(data.draws,data.context)}); }
  catch(error) { self.postMessage({error:error.message}); }
};
