// MoveOn — shared personalized daily challenge engine
// The same onboarding answers always drive the plan, while the date rotates
// the selection so the user gets variety without losing personalization.

const CHALLENGE_LIBRARY = [
  {id:'profile-break',emoji:'📵',title:'Give their profile a 30-minute break',description:'Protect your peace before the urge becomes a spiral.',xp:15,tags:['Letting go','Sad','Lonely','Overthinking']},
  {id:'trigger-note',emoji:'💭',title:'Name one trigger you want to release',description:'Write what triggered you and what you need instead.',xp:15,tags:['Letting go','Thoughts','Overthinking','Journaling']},
  {id:'peace-boundary',emoji:'🛡️',title:'Choose one boundary that protects your peace',description:'Decide what you will not chase, check or explain today.',xp:20,tags:['Letting go','Self-worth','Strength']},
  {id:'unsent-letter',emoji:'📝',title:'Write an unsent letter',description:'Say everything you feel without sending it to anyone.',xp:20,tags:['Letting go','Journaling','Sad','Angry','Healing']},
  {id:'memory-box',emoji:'📦',title:'Put one painful reminder out of sight',description:'Create a little distance from one object, photo or chat that pulls you back.',xp:20,tags:['Letting go','Healing','Moving forward']},
  {id:'walk',emoji:'🚶',title:'Take a 10-minute walk',description:'Move your body and give your mind a change of scene.',xp:15,tags:['Activities','Self-growth','Lonely','Peace','Sad']},
  {id:'water',emoji:'💧',title:'Drink a full glass of water mindfully',description:'Pause for one minute and take care of your body.',xp:10,tags:['Activities','Self-growth','Everything','Peace']},
  {id:'phonebreak',emoji:'📱',title:'Take a 30-minute phone break',description:'Put your phone away and give your attention back to yourself.',xp:15,tags:['Activities','Overthinking','Sleep','Peace']},
  {id:'sunlight',emoji:'☀️',title:'Get 10 minutes of daylight',description:'Step outside or sit near natural light and reset your routine.',xp:15,tags:['Activities','Self-growth','Sleep','Everything']},
  {id:'tidy',emoji:'🧹',title:'Reset one small corner of your room',description:'A cleaner space can make one small part of the day feel lighter.',xp:15,tags:['Activities','Self-growth','Future']},
  {id:'gratitude',emoji:'🌻',title:'Write 3 things you are grateful for',description:'Small good moments still count.',xp:15,tags:['Journaling','Happiness','Peace','Everything']},
  {id:'selfcare',emoji:'💜',title:'Do one kind thing for yourself',description:'Rest, read, shower, stretch or do something caring.',xp:20,tags:['Self-worth','Self-growth','Self-love','Everything']},
  {id:'mirror',emoji:'🪞',title:'Write 3 things you like about yourself',description:'Your worth is bigger than one relationship.',xp:20,tags:['Self-worth','Self-love','Strength']},
  {id:'achievement',emoji:'🏆',title:'Finish one small task you have been avoiding',description:'A completed task can rebuild confidence.',xp:20,tags:['Self-worth','Self-growth','Future','Strength']},
  {id:'affirmation',emoji:'✨',title:'Repeat one kind statement about yourself',description:'Speak to yourself like someone you want to help heal.',xp:15,tags:['Self-worth','Self-love','Happiness']},
  {id:'three-wins',emoji:'🌟',title:'Write 3 small wins from this week',description:'Notice progress that you might normally overlook.',xp:20,tags:['Self-worth','Self-growth','Happiness','Strength']},
  {id:'breathing',emoji:'🧘',title:'Do a 3-minute breathing session',description:'Slow down your body before trying to solve everything.',xp:15,tags:['Calm','Thoughts','Overthinking','Peace','Sleep']},
  {id:'grounding',emoji:'🌿',title:'Try the 5-4-3-2-1 grounding exercise',description:'Bring your attention back to what is happening right now.',xp:20,tags:['Calm','Thoughts','Overthinking','Anxiety']},
  {id:'quiet',emoji:'🌙',title:'Spend 10 quiet minutes without scrolling',description:'Let your mind settle without feeding it more noise.',xp:15,tags:['Calm','Sleep','Overthinking','Peace']},
  {id:'thought-check',emoji:'🧠',title:'Question one negative thought',description:'Ask: is this a fact, a fear, or an old story?',xp:20,tags:['Thoughts','Overthinking','Calm','Healing']},
  {id:'journal',emoji:'📔',title:'Journal for 5 minutes without editing yourself',description:'Write honestly. You do not need perfect words.',xp:15,tags:['Journaling','Thoughts','Sad','Lonely','Healing']},
  {id:'sleep',emoji:'😴',title:'Start a 30-minute screen-free wind-down',description:'Make tonight a little gentler on your routine.',xp:20,tags:['Sleep','Calm','Self-growth']},
  {id:'bedtime',emoji:'🌙',title:'Set a realistic bedtime for tonight',description:'A predictable night can make tomorrow feel easier.',xp:15,tags:['Sleep','Self-growth','Activities']},
  {id:'morning',emoji:'🌅',title:'Create a 3-step morning reset',description:'Pick wake-up, water and one meaningful task for tomorrow.',xp:20,tags:['Self-growth','Future','Sleep','Activities']},
  {id:'future',emoji:'🎯',title:'Write one goal for the next 30 days',description:'Give your attention somewhere hopeful to go.',xp:20,tags:['Future','Moving forward','Self-growth','Strength']},
  {id:'plan',emoji:'🚀',title:'Make a simple plan for tomorrow',description:'Pick three realistic things you want to do for yourself.',xp:20,tags:['Future','Self-growth','Moving forward']},
  {id:'newthing',emoji:'🌱',title:'Try one small thing you have never done',description:'Growth often begins with something tiny and new.',xp:20,tags:['Self-growth','Future','Happiness','Strength']},
  {id:'learn',emoji:'📚',title:'Learn one useful thing about yourself',description:'Notice one pattern, need or strength you want to understand better.',xp:15,tags:['Learning','Thoughts','Future','Everything']},
  {id:'talk',emoji:'💬',title:'Talk to someone you trust for 10 minutes',description:'Connection can make a heavy day feel less lonely.',xp:20,tags:['Conversation','Lonely','Sad','Everything']},
  {id:'ask-help',emoji:'🤝',title:'Tell someone how your day really feels',description:'You do not have to carry every feeling silently.',xp:20,tags:['Conversation','Lonely','Sad','Healing']},
  {id:'joy',emoji:'😊',title:'Do one activity that genuinely makes you smile',description:'You are allowed to have a good moment while healing.',xp:20,tags:['Happiness','Self-love','Lonely','Everything']},
  {id:'music',emoji:'🎧',title:'Make a 3-song feel-good playlist',description:'Choose songs that help you feel present rather than stuck in the past.',xp:15,tags:['Happiness','Activities','Moving forward']},
  {id:'no-checking',emoji:'🚫',title:'Skip one urge to check their status',description:'Notice the urge, wait 10 minutes and choose yourself.',xp:20,tags:['Letting go','Overthinking','Self-worth','Healing']},
  {id:'future-self',emoji:'🔭',title:'Write a note to your future self',description:'Describe the person you are becoming, not the relationship you lost.',xp:20,tags:['Future','Moving forward','Self-worth','Healing']},
  {id:'room-reset',emoji:'🛏️',title:'Make your bed and reset your space',description:'Start with one simple action that tells your brain: today matters.',xp:10,tags:['Self-growth','Activities','Everything']},
  {id:'kindness',emoji:'💐',title:'Do one small kind act for someone',description:'A little connection can bring warmth back into your day.',xp:20,tags:['Conversation','Happiness','Self-growth','Everything']},
  {id:'screen-free-meal',emoji:'🍽️',title:'Have one meal without your phone',description:'Give yourself a few quiet minutes to actually be where you are.',xp:15,tags:['Activities','Overthinking','Calm','Everything']},
  {id:'body-stretch',emoji:'🧘‍♂️',title:'Stretch for 8 minutes',description:'Release some physical tension and reconnect with your body.',xp:15,tags:['Activities','Calm','Self-growth','Sad']},
  {id:'release',emoji:'🍃',title:'Finish this sentence: “I am allowed to let go of…”',description:'Complete it honestly in your journal.',xp:20,tags:['Letting go','Journaling','Healing','Moving forward']},
  {id:'values',emoji:'🧭',title:'Choose 3 values you want your next chapter to have',description:'Pick values such as peace, respect, growth, honesty or freedom.',xp:20,tags:['Future','Self-worth','Moving forward','Learning']},
  {id:'win-back',emoji:'🔥',title:'Do one thing you stopped doing for yourself',description:'Take back a small part of your routine that used to be yours.',xp:20,tags:['Self-growth','Self-love','Future','Letting go']},
  {id:'tomorrow-care',emoji:'🗓️',title:'Prepare one thing for tomorrow',description:'Pack, plan or organize one small thing that will help future-you.',xp:15,tags:['Future','Self-growth','Activities']}
];

function hashString(value){let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}

function scoreChallenge(item, answers){
  let score=0;
  for(const raw of answers){
    const answer=String(raw||'').toLowerCase();
    if(!answer) continue;
    for(const tag of item.tags){
      const t=tag.toLowerCase();
      if(t===answer) score+=8;
      else if(t.includes(answer)||answer.includes(t)) score+=3;
    }
  }
  return score;
}

export function getPersonalizedChallenges(onboarding={}, dateKey, count=5){
  const answers=[onboarding.mood,onboarding.goal,onboarding.support,onboarding.future].filter(Boolean).map(String);
  const day=String(dateKey||new Date().toISOString().slice(0,10));
  const scored=CHALLENGE_LIBRARY.map(item=>({...item,score:scoreChallenge(item,answers)}));
  const personalized=scored.filter(x=>x.score>0).sort((a,b)=>b.score-a.score || a.id.localeCompare(b.id));
  const neutral=scored.filter(x=>x.score===0).sort((a,b)=>a.id.localeCompare(b.id));
  const seed=hashString(`${answers.join('|')}|${day}`);
  const chosen=[];const used=new Set();

  // First choose only from challenges that actually match the onboarding answers.
  // This makes different onboarding profiles produce genuinely different plans.
  if(personalized.length){
    const windowSize=Math.min(personalized.length,Math.max(count*3,10));
    const window=personalized.slice(0,windowSize);
    let cursor=seed%window.length;
    const preferredGroups=[
      ['Letting go','Healing'],
      ['Thoughts','Overthinking','Calm'],
      ['Self-worth','Self-love'],
      ['Self-growth','Activities','Sleep'],
      ['Future','Moving forward','Happiness','Conversation']
    ];
    // Try to cover different parts of the user's plan while staying personalized.
    for(let g=0;g<preferredGroups.length && chosen.length<count;g++){
      const group=preferredGroups[g];
      const candidates=window.filter(x=>!used.has(x.id)&&group.some(t=>x.tags.includes(t)));
      if(!candidates.length) continue;
      const item=candidates[(cursor+g*7)%candidates.length];
      chosen.push(item);used.add(item.id);
    }
    // Fill remaining slots from the highest-scoring personalized pool.
    for(let i=0;i<window.length && chosen.length<count;i++){
      const item=window[(cursor+i)%window.length];
      if(!used.has(item.id)){chosen.push(item);used.add(item.id);}
    }
  }

  // Only use neutral challenges if the user's answers don't have enough matches.
  if(chosen.length<count){
    const start=seed%Math.max(1,neutral.length);
    for(let i=0;i<neutral.length && chosen.length<count;i++){
      const item=neutral[(start+i)%neutral.length];
      if(!used.has(item.id)){chosen.push(item);used.add(item.id);}
    }
  }
  return chosen.slice(0,count);
}

export function getPersonalizedDailyChallenge(onboarding={}, dateKey){
  return getPersonalizedChallenges(onboarding,dateKey,5)[0];
}
