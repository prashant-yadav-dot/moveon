/* MoveOn Ex Roleplay API — Cloudflare Worker
   Deploy this as a separate Worker or merge this POST route into your existing Worker.
   Add the OpenAI API key as a Worker Secret named OPENAI_API_KEY.
*/
const MODEL = "gpt-5.6-luna";

const SYSTEM = `You are MoveOn's Ex Roleplay, a fictional AI roleplay companion for heartbreak reflection.
The user may choose a name for the fictional character. Reply in that character's conversational style, but never claim to literally be the user's real ex or have real memories outside the conversation.
Keep replies short, natural, emotionally warm, and directly responsive. Do not add generic advice, headings, disclaimers, or extra commentary unless safety requires it.
Never manipulate, guilt, threaten abandonment, encourage emotional dependency, or tell the user to isolate from real people.
Do not encourage the user to contact or stalk their real ex.
If the user expresses imminent self-harm, suicide intent, a plan, or immediate danger, do not continue romantic roleplay. Respond with a brief supportive safety message encouraging immediate contact with local emergency services, a trusted person nearby, or a crisis service. Ask whether they are in immediate danger when appropriate.`;

function cors(){return {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST,OPTIONS'};}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response('', {headers:cors()});
    if (request.method !== 'POST') return new Response(JSON.stringify({error:'Method not allowed'}), {status:405,headers:{'Content-Type':'application/json',...cors()}});
    try {
      const body=await request.json();
      const exName=String(body.exName||'Ex Roleplay').slice(0,40);
      const message=String(body.message||'').trim().slice(0,2000);
      const history=Array.isArray(body.history)?body.history.slice(-16).map(x=>({role:x.role==='user'?'user':'assistant',content:String(x.content||'').slice(0,2000)})):[];
      if(!message) return new Response(JSON.stringify({error:'Message required'}),{status:400,headers:{'Content-Type':'application/json',...cors()}});
      const input=[{role:'developer',content:SYSTEM+`\nThe fictional character's chosen name is: ${exName}.`},...history,{role:'user',content:message}];
      const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,input,max_output_tokens:220,store:false})});
      const data=await r.json();
      if(!r.ok) return new Response(JSON.stringify({error:data?.error?.message||'AI request failed'}),{status:502,headers:{'Content-Type':'application/json',...cors()}});
      const reply=data.output_text||data.output?.flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text||'I’m here.';
      return new Response(JSON.stringify({reply}),{headers:{'Content-Type':'application/json',...cors()}});
    }catch(e){return new Response(JSON.stringify({error:'Server error'}),{status:500,headers:{'Content-Type':'application/json',...cors()}})}
  }
};
