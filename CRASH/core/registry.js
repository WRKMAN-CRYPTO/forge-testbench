// The registry belongs to HQ, not to Crash's mind.
export const slots=['architecture','perception','memory','decisions','agents','actions'];
export function validateModule(m){if(!m||typeof m.id!=='string'||!slots.includes(m.slot)||typeof m.create!=='function')throw Error('Invalid armory module');return m;}
export function createRegistry(){const modules=new Map();return {register(m){validateModule(m);if(modules.has(m.id))throw Error('Duplicate module: '+m.id);modules.set(m.id,m);},all(){return [...modules.values()]},get(id){return modules.get(id)}};}