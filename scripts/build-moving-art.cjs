const fs=require('node:fs'),vm=require('node:vm');
const context={window:{}};vm.runInNewContext(fs.readFileSync('public/pages/moving/config.js','utf8'),context);
const art=context.window.journalConfig.coverArt;
fs.mkdirSync('public/pages/moving/assets',{recursive:true});
const svg=(viewBox,art)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice"><title>阳光、纸箱与新家的窗</title>${art}</svg>\n`;
fs.writeFileSync('public/pages/moving/assets/cover.svg',svg('0 0 1440 900',art));
// Recompose the room for portrait: keep the window, boxes and plant in frame.
const portrait=`<path fill="#809fb3" d="M0 0h600v1150H0z"/><path fill="#9db5c3" d="M0 840h600v310H0z"/><path fill="#fff1c4" opacity=".48" d="m165 400 300 40 135 710H0z"/><path fill="#d6e4eb" d="M130 220h340v440H130z"/><path fill="#b4d9e7" d="M145 235h310v410H145z"/><circle fill="#fff1bf" cx="390" cy="315" r="36"/><circle fill="#fff1bf" opacity=".12" cx="390" cy="315" r="54"/><path fill="#89b5c3" d="M145 475q170-100 310-15v185H145z"/><path stroke="#d6e4eb" stroke-width="11" d="M300 235v410M145 440h310"/><path fill="#becfdc" d="M100 205h40v505h-40zm360 0h45v505h-45z"/><g transform="translate(-685 260)">${art.slice(art.indexOf('<ellipse fill="#638297"'),art.indexOf('<path fill="#426379"'))}</g>`;
fs.writeFileSync('public/pages/moving/assets/cover-mobile.svg',svg('0 0 600 1150',portrait));
