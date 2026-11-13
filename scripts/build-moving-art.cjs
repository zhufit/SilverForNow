const fs=require('node:fs'),vm=require('node:vm');
const context={window:{}};vm.runInNewContext(fs.readFileSync('public/pages/moving/config.js','utf8'),context);
const art=context.window.journalConfig.scenes[0].art;
fs.mkdirSync('public/pages/moving/assets',{recursive:true});
const svg=(viewBox,art)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice"><title>阳光、纸箱与新家的窗</title>${art}</svg>\n`;
fs.writeFileSync('public/pages/moving/assets/room.svg',svg('0 0 1440 900',art));
// Recompose the room for portrait: keep the window, boxes and plant in frame.
const portrait=`<path fill="#809fb3" d="M0 0h600v1150H0z"/><path fill="#9db5c3" d="M0 840h600v310H0z"/><path fill="#fff1c4" opacity=".48" d="m165 400 300 40 135 710H0z"/><path fill="#d6e4eb" d="M130 220h340v440H130z"/><path fill="#b4d9e7" d="M145 235h310v410H145z"/><circle fill="#fff1bf" cx="390" cy="315" r="36"/><circle fill="#fff1bf" opacity=".12" cx="390" cy="315" r="54"/><path fill="#89b5c3" d="M145 475q170-100 310-15v185H145z"/><path stroke="#d6e4eb" stroke-width="11" d="M300 235v410M145 440h310"/><path fill="#becfdc" d="M100 205h40v505h-40zm360 0h45v505h-45z"/><g transform="translate(-685 260)">${art.slice(art.indexOf('<ellipse fill="#638297"'),art.indexOf('<path fill="#426379"'))}</g>`;
fs.writeFileSync('public/pages/moving/assets/room-mobile.svg',svg('0 0 600 1150',portrait));

// A separate departure still life, leaving the centre clear for the HTML title.
// Shared objects retain the chapter's flat, mist-blue vector vocabulary.
const packing=`<ellipse fill="#42657e" opacity=".18" cx="0" cy="206" rx="360" ry="30"/>
<g stroke="#52758e" stroke-width="9" fill="none"><path d="M155-48v-110q0-12 12-12h48q12 0 12 12v110"/></g>
<rect fill="#52758e" x="133" y="-65" width="119" height="248" rx="22"/>
<rect fill="#7398af" x="142" y="-56" width="101" height="226" rx="16"/>
<path stroke="#abc8d9" stroke-width="5" opacity=".6" d="M166-26v160m26-160v160m26-160v160"/>
<g fill="#3f627b"><circle cx="158" cy="187" r="10"/><circle cx="228" cy="187" r="10"/></g>
<path fill="#9ebaca" d="M-260 12h246v184h-246z"/><path fill="#bed1da" d="m-260 12 62-31H44L-14 12z"/><path fill="#7e9eb3" d="M-14 12 44-19v184l-58 31z"/>
<path fill="#e4dfc8" d="M-151 12h28v184h-28z"/><path fill="#f0e9d0" d="m-151 12 61-31h28l-61 31z"/>
<rect x="-232" y="50" width="52" height="24" rx="2" fill="#dce7eb"/>
<path fill="#789aaf" d="M-225-115h176V12h-176z"/><path fill="#a9c4d2" d="m-225-115 35-28H-14l-35 28z"/><path fill="#64879f" d="m-49-115 35-28v126l-35 29z"/>
<path fill="#e4dfc8" d="M-149-115h24V12h-24z"/><path fill="#f0e9d0" d="m-149-115 35-28h24l-35 28z"/>
<path fill="#c0d3de" d="M15 85h113v111H15z"/><path fill="#e5ebeb" d="m15 85 27-19h113l-27 19z"/><path fill="#91afc2" d="m128 85 27-19v111l-27 19z"/>
<path fill="#ede6cc" d="M62 85h19v111H62z"/><path fill="#f3edd9" d="m62 85 27-19h19L81 85z"/>
<g transform="translate(-137 -147)"><ellipse fill="#eadfba" rx="28" ry="10"/><path fill="#cabf9d" d="M-28 0v19a28 10 0 0 0 56 0V0a28 10 0 0 1-56 0"/><ellipse fill="#7294aa" rx="12" ry="4"/></g>
<g transform="translate(277 52)"><path stroke="#426c7c" stroke-width="5" fill="none" d="M0 80V-35m0 74-28-32m28 5 30-42"/><g fill="#57808b"><ellipse cx="-21" cy="2" rx="12" ry="26" transform="rotate(-40 -21 2)"/><ellipse cx="23" cy="-26" rx="12" ry="28" transform="rotate(35 23 -26)"/><ellipse cy="-45" rx="11" ry="25"/></g><path fill="#adc4d1" d="M-32 72h64l-8 67h-48z"/><path stroke="#d0dfe5" stroke-width="6" d="M-34 72h68"/></g>`;
const keys=`<g fill="none" stroke="#eee3bd" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><circle cy="0" r="18"/><path d="M-8 17v55h14V61h10V49H-8m22-32 23 36 11-7-5-8 8-5-8-12-9 5"/></g>`;
const cover=(viewBox,body)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice"><title>打包启程：纸箱、行李与新家的钥匙</title><desc>雾蓝色扁平插画，打包好的纸箱与行李箱旁放着一盆绿植，留白处是一串新家钥匙。</desc>${body}</svg>\n`;
fs.writeFileSync('public/pages/moving/assets/cover.svg',cover('0 0 1440 900',`<path fill="#809fb3" d="M0 0h1440v900H0z"/><path fill="#91adbf" d="M0 738h1440v162H0z"/><path fill="#afc6d3" opacity=".24" d="m1190 0 250 0v900H625z"/><g transform="translate(720 675) scale(.7)">${packing}</g><g transform="translate(1120 220) rotate(-12)">${keys}</g>`));
fs.writeFileSync('public/pages/moving/assets/cover-mobile.svg',cover('0 0 600 1150',`<path fill="#809fb3" d="M0 0h600v1150H0z"/><path fill="#91adbf" d="M0 960h600v190H0z"/><path fill="#afc6d3" opacity=".24" d="m555 0 45 0v1150H125z"/><g transform="translate(292 891) scale(.76)">${packing}</g><g transform="translate(430 245) rotate(-12)">${keys}</g>`));
