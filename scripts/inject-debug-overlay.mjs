#!/usr/bin/env node
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';

const target = process.argv[2];
if (!target) {
  console.error('usage: inject-debug-overlay.mjs <path-to-index.html>');
  process.exit(1);
}

const overlay = `<script>(function(){
var lines=[];var box;var attached=false;
function makeBox(){if(box)return;box=document.createElement('div');box.id='__matflow_debug__';box.setAttribute('data-mfdbg','1');box.style.cssText='position:fixed;left:0;right:0;top:0;z-index:2147483647;background:#111;color:#0f0;font:10px/1.3 Menlo,monospace;padding:6px;max-height:60vh;overflow:auto;white-space:pre-wrap;word-break:break-all;pointer-events:auto;border-bottom:2px solid #0f0';}
function attach(){makeBox();if(attached)return;try{document.documentElement.appendChild(box);attached=true;}catch(e){}}
function flush(){if(!box)return;box.textContent='[MatFlow debug] '+lines.length+' events\\n\\n'+lines.slice(-100).join('\\n\\n');}
function add(s){try{lines.push(s);try{localStorage.setItem('__mfdbg__',JSON.stringify(lines.slice(-100)));}catch(_){};attach();flush();}catch(_){}}
// keep reattaching in case React/anyone removes it
setInterval(function(){if(box && !document.documentElement.contains(box)){attached=false;attach();flush();}},250);
add('boot ts='+Date.now());
add('ua='+navigator.userAgent);
add('location='+location.href);
window.addEventListener('error',function(e){add('[ERR] '+(e.message||'')+' @ '+(e.filename||'?')+':'+(e.lineno||0)+':'+(e.colno||0)+'\\n'+((e.error&&e.error.stack)||''));},true);
window.addEventListener('unhandledrejection',function(e){var r=e.reason;add('[REJ] '+((r&&(r.stack||r.message))||String(r)));});
var oe=console.error;console.error=function(){try{add('[con.error] '+Array.prototype.map.call(arguments,function(x){try{return (x&&x.stack)||(typeof x==='string'?x:JSON.stringify(x));}catch(_){return String(x);}}).join(' '));}catch(_){}return oe.apply(console,arguments);};
var ow=console.warn;console.warn=function(){try{add('[con.warn] '+Array.prototype.map.call(arguments,String).join(' '));}catch(_){}return ow.apply(console,arguments);};
var ol=console.log;console.log=function(){try{add('[con.log] '+Array.prototype.map.call(arguments,function(x){try{return (typeof x==='string')?x:JSON.stringify(x);}catch(_){return String(x);}}).join(' '));}catch(_){}return ol.apply(console,arguments);};
document.addEventListener('DOMContentLoaded',function(){add('DOMContentLoaded; head children='+document.head.children.length+' body present='+!!document.body);});
window.addEventListener('load',function(){add('window.load; body kids='+(document.body?document.body.children.length:0));});
setTimeout(function(){add('+1s body kids='+(document.body?document.body.children.length:'-')+' first='+(document.body && document.body.firstElementChild ? document.body.firstElementChild.outerHTML.slice(0,160) : '-'));},1000);
setTimeout(function(){add('+3s body kids='+(document.body?document.body.children.length:'-'));},3000);
setTimeout(function(){add('+6s body kids='+(document.body?document.body.children.length:'-')+' bg='+(document.body?getComputedStyle(document.body).backgroundColor:'-'));},6000);
})();</script>`;

let html = readFileSync(target, 'utf8');
if (html.includes('__matflow_debug__')) {
  console.log('already injected, replacing');
  html = html.replace(/<script>\(function\(\)\{[\s\S]*?__matflow_debug__[\s\S]*?\}\)\(\);<\/script>/, '');
}
const inserted = html.replace('<head>', '<head>' + overlay);
if (inserted === html) {
  console.error('could not find <head> tag');
  process.exit(2);
}
copyFileSync(target, target + '.bak');
writeFileSync(target, inserted);
console.log('injected; original backed up to', target + '.bak');

