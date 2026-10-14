'use strict';
const crypto=require('node:crypto');
const {shopHost}=require('../shopify.js');
const safeEqual=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y)};
function verifyIdToken(jwt,secret,clientId,now=Math.floor(Date.now()/1000)){
 if(typeof jwt!=='string'||jwt.length>4096||jwt.split('.').length!==3)throw Error('Invalid session');
 const [h,p,s]=jwt.split('.');let header,body;
 try{header=JSON.parse(Buffer.from(h,'base64url'));body=JSON.parse(Buffer.from(p,'base64url'));}catch{throw Error('Invalid session')}
 if(header.alg!=='HS256'||header.typ&&header.typ!=='JWT')throw Error('Invalid session');
 const sig=crypto.createHmac('sha256',secret).update(`${h}.${p}`).digest();
 if(!safeEqual(sig,Buffer.from(s,'base64url')))throw Error('Invalid session');
 if(body.aud!==clientId||!Number.isSafeInteger(body.exp)||body.exp<=now||body.exp>now+180||!Number.isSafeInteger(body.nbf)||body.nbf>now+30||!Number.isSafeInteger(body.iat)||body.iat>now+30)throw Error('Invalid session');
 let domain,iss,dest;try{iss=new URL(body.iss);dest=new URL(body.dest);domain=shopHost(dest.hostname);}catch{throw Error('Invalid session')}
 if(iss.protocol!=='https:'||iss.hostname!==domain||iss.pathname!=='/admin'||dest.protocol!=='https:'||dest.hostname!==domain||dest.pathname!=='/'||!body.sub)throw Error('Invalid session');
 return {shop:domain,subject:String(body.sub).slice(0,64)};
}
function verifyWebhook(raw,hmac,secret){if(!Buffer.isBuffer(raw)||raw.length>256000||typeof hmac!=='string'||!/^[A-Za-z0-9+/=]+$/.test(hmac))return false;
 const signature=crypto.createHmac('sha256',secret).update(raw).digest();return safeEqual(signature,Buffer.from(hmac,'base64'));
}
function encryptionKey(env){const h=String(env.LIBERIENT_TOKEN_ENCRYPTION_KEY||'');if(!/^[a-fA-F0-9]{64}$/.test(h))throw Error('Missing 32-byte token encryption key');return Buffer.from(h,'hex');}
function encryptToken(value,key){if(typeof value!=='string'||!value||value.length>3000)throw Error('Token format invalid');const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);const ct=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),ct]).toString('base64url');}
function decryptToken(ciphertext,key){const b=Buffer.from(ciphertext,'base64url');if(b.length<29)throw Error('Invalid encrypted token');const decipher=crypto.createDecipheriv('aes-256-gcm',key,b.subarray(0,12));decipher.setAuthTag(b.subarray(12,28));return Buffer.concat([decipher.update(b.subarray(28)),decipher.final()]).toString('utf8');}
function isConfigured(env){return env.LIBERIENT_EMBEDDED_ENABLED==='true'&&env.F2_DEMO_MODE==='false'&&typeof env.SHOPIFY_CLIENT_ID==='string'&&env.SHOPIFY_CLIENT_ID.length>3&&typeof env.SHOPIFY_CLIENT_SECRET==='string'&&env.SHOPIFY_CLIENT_SECRET.length>10&&!!env.LIBERIENT_DATABASE_URL&&/^[a-fA-F0-9]{64}$/.test(String(env.LIBERIENT_TOKEN_ENCRYPTION_KEY||''));}
module.exports={verifyIdToken,verifyWebhook,encryptionKey,encryptToken,decryptToken,isConfigured};
