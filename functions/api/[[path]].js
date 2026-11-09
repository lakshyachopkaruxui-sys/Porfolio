import {createAssistantHandler} from '../_lib/assistant.mjs';
import knowledge from '../_lib/knowledge.mjs';
import {publicOrigin} from '../_lib/config.mjs';
const handle = createAssistantHandler({loadKnowledge:async()=>knowledge});
export const onRequest = ({request,env}) => handle(request,{...env,PUBLIC_ORIGIN:env.PUBLIC_ORIGIN || publicOrigin});
