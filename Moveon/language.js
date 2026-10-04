/* MoveOn universal language manager. Uses Google Translate for broad language coverage,
   persists the choice per signed-in Firebase user + device, and asks on first launch. */
import { auth, database } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { ref, get, update } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

const LANGS = [
  ["en","English"],["hi","हिन्दी"],["bn","বাংলা"],["pa","ਪੰਜਾਬੀ"],["mr","मराठी"],["gu","ગુજરાતી"],
  ["ta","தமிழ்"],["te","తెలుగు"],["kn","ಕನ್ನಡ"],["ml","മലയാളം"],["ur","اردو"],["es","Español"],
  ["fr","Français"],["de","Deutsch"],["ar","العربية"],["pt","Português"],["ru","Русский"],
  ["ja","日本語"],["ko","한국어"],["zh-CN","简体中文"],["zh-TW","繁體中文"],["it","Italiano"],
  ["tr","Türkçe"],["id","Bahasa Indonesia"],["th","ไทย"],["vi","Tiếng Việt"]
];
const KEY="moveon_language";
const userKey=(uid)=>`moveon_language_${uid}`;
let applying=false;

function setCookie(name,value){document.cookie=`${name}=${value};path=/;max-age=31536000;SameSite=Lax`;}
function getCookie(name){const m=document.cookie.match(new RegExp('(?:^|; )'+name.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')+'=([^;]*)'));return m?decodeURIComponent(m[1]):'';}
function applyGoogle(code){
  if(!code) return;
  if(code==='en'){setCookie('googtrans','/en/en'); location.reload(); return;}
  setCookie('googtrans',`/en/${code}`);
  location.reload();
}
function ensureGoogle(){
  if(window.google?.translate) return;
  window.googleTranslateElementInit=function(){
    try{new google.translate.TranslateElement({pageLanguage:'en',autoDisplay:false,multilanguagePage:true},'google_translate_element');}catch(e){}
  };
  const s=document.createElement('script'); s.src='https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'; s.async=true; document.head.appendChild(s);
}
function hideGoogle(){
  const s=document.createElement('style'); s.textContent='.goog-te-banner-frame.skiptranslate{display:none!important}body{top:0!important}.goog-te-gadget{font-size:0!important}.goog-logo-link{display:none!important}#google_translate_element{display:none!important}'; document.head.appendChild(s);
}
function buildModal(){
  if(document.getElementById('moveonLanguageModal')) return;
  const m=document.createElement('div'); m.id='moveonLanguageModal'; m.innerHTML=`<div class="mo-lang-backdrop"><div class="mo-lang-card"><div class="mo-lang-icon">🌍</div><h2>Choose your language</h2><p>MoveOn will use your selected language across the app. You can change it anytime from your profile/settings.</p><select id="moLangSelect">${LANGS.map(([c,n])=>`<option value="${c}">${n}</option>`).join('')}</select><button id="moLangSave">Continue</button><small>Your choice is saved for this MoveOn account.</small></div></div>`;
  const st=document.createElement('style'); st.textContent=`#moveonLanguageModal{position:fixed;inset:0;z-index:2147483000}.mo-lang-backdrop{min-height:100%;display:grid;place-items:center;padding:20px;background:rgba(20,16,40,.52);backdrop-filter:blur(8px)}.mo-lang-card{width:min(430px,94vw);background:#fff;border-radius:26px;padding:28px;box-shadow:0 24px 80px rgba(40,30,90,.28);text-align:center;color:#222}.mo-lang-icon{font-size:44px}.mo-lang-card h2{margin:8px 0}.mo-lang-card p{color:#777;line-height:1.55;font-size:14px}.mo-lang-card select{width:100%;padding:13px;border:1px solid #ddd9ee;border-radius:14px;margin:14px 0;font-size:16px}.mo-lang-card button{width:100%;padding:14px;border:0;border-radius:14px;background:#6c63ff;color:#fff;font-weight:800;font-size:16px}.mo-lang-card small{display:block;margin-top:10px;color:#888}`; document.head.appendChild(st); document.body.appendChild(m);
  const sel=m.querySelector('#moLangSelect'); const saved=localStorage.getItem(KEY)||'en'; sel.value=saved;
  m.querySelector('#moLangSave').onclick=async()=>{const code=sel.value; localStorage.setItem(KEY,code); if(auth.currentUser){localStorage.setItem(userKey(auth.currentUser.uid),code); try{await update(ref(database,`users/${auth.currentUser.uid}`),{language:code});}catch(e){}} applyGoogle(code);};
}
function showModal(){buildModal(); document.getElementById('moveonLanguageModal').style.display='block';}
async function syncUserLanguage(user){
  if(!user) return;
  let lang=localStorage.getItem(userKey(user.uid));
  try{const s=await get(ref(database,`users/${user.uid}/language`)); if(s.exists() && s.val()) lang=s.val();}catch(e){}
  if(lang){localStorage.setItem(KEY,lang); localStorage.setItem(userKey(user.uid),lang); const current=getCookie('googtrans'); const wanted=`/en/${lang}`; if(lang!=='en' && current!==wanted){setCookie('googtrans',wanted); location.reload();} else if(lang==='en' && current && current!=='/en/en'){setCookie('googtrans','/en/en'); location.reload();}}
  else { setTimeout(showModal, 250); }
}
function injectProfileLanguageButton(){
  if(!document.body || document.getElementById('moveonLanguageButton')) return;
  const b=document.createElement('button'); b.id='moveonLanguageButton'; b.type='button'; b.textContent='🌍 Language'; b.style.cssText='position:fixed;right:14px;bottom:84px;z-index:1000;border:0;border-radius:999px;padding:10px 13px;background:#fff;box-shadow:0 8px 24px rgba(50,40,100,.14);color:#5d52dc;font-weight:700;cursor:pointer'; b.onclick=()=>showModal(); document.body.appendChild(b);
}
ensureGoogle(); hideGoogle();
document.addEventListener('DOMContentLoaded',()=>{const saved=localStorage.getItem(KEY); if(!saved) setTimeout(showModal,450); else injectProfileLanguageButton();});
onAuthStateChanged(auth,async user=>{await syncUserLanguage(user); if(localStorage.getItem(KEY)) injectProfileLanguageButton();});
