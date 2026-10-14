'use strict';
// Persistent store isolation: every SQL query scopes to a verified shop identity.
const {encryptToken,decryptToken,encryptionKey}=require('./security.js');
const SCHEMA=`CREATE TABLE IF NOT EXISTS liberient_shops (
 shop TEXT PRIMARY KEY, access_cipher TEXT, refresh_cipher TEXT, token_expires_at TIMESTAMPTZ,
 refresh_expires_at TIMESTAMPTZ, scopes TEXT NOT NULL DEFAULT '', currency TEXT, timezone TEXT, dirty BOOLEAN NOT NULL DEFAULT TRUE,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS liberient_daily (
 shop TEXT NOT NULL REFERENCES liberient_shops(shop) ON DELETE CASCADE, day DATE NOT NULL,
 subtotal_proxy NUMERIC(18,2) NOT NULL, orders INTEGER NOT NULL,
 PRIMARY KEY(shop,day));
CREATE TABLE IF NOT EXISTS liberient_receipts (
 shop TEXT NOT NULL REFERENCES liberient_shops(shop) ON DELETE CASCADE, receipt_id TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(shop,receipt_id));`;
function createStorage({pool,env=process.env}={}){
 if(!pool)throw Error('Postgres connection required');const key=encryptionKey(env);
 async function init(){await pool.query(SCHEMA);}
 async function getShop(shop){const r=await pool.query('SELECT shop,access_cipher,refresh_cipher,token_expires_at,refresh_expires_at,scopes,currency,timezone,dirty,updated_at FROM liberient_shops WHERE shop=$1',[shop]);
  if(!r.rows[0])return null;const d=r.rows[0];return {...d,accessToken:d.access_cipher?decryptToken(d.access_cipher,key):null,refreshToken:d.refresh_cipher?decryptToken(d.refresh_cipher,key):null};}
 async function saveToken(shop,token){const expires=new Date(Date.now()+(Number(token.expires_in)-90)*1000);const refreshExpires=new Date(Date.now()+(Number(token.refresh_token_expires_in)||7776000)*1000);
  if(!Number.isFinite(expires.getTime())||expires<=new Date()||!token.refresh_token)throw Error('Expiring offline token and refresh required');
  const scopes=String(token.scope||'');if(!scopes.split(',').includes('read_orders')||scopes.split(',').some(x=>x.trim().startsWith('write_')))throw Error('Only approved read scopes allowed');
  await pool.query(`INSERT INTO liberient_shops(shop,access_cipher,refresh_cipher,token_expires_at,refresh_expires_at,scopes,dirty)
   VALUES($1,$2,$3,$4,$5,$6,TRUE) ON CONFLICT(shop) DO UPDATE SET
   access_cipher=excluded.access_cipher,refresh_cipher=excluded.refresh_cipher,token_expires_at=excluded.token_expires_at,
   refresh_expires_at=excluded.refresh_expires_at,scopes=excluded.scopes,updated_at=now()`,[shop,encryptToken(token.access_token,key),encryptToken(token.refresh_token,key),expires,refreshExpires,scopes]);}
 async function markDirty(shop){await pool.query('UPDATE liberient_shops SET dirty=TRUE,updated_at=now() WHERE shop=$1',[shop]);}
 async function recordWebhook(shop,id){const r=await pool.query('INSERT INTO liberient_receipts(shop,receipt_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING receipt_id',[shop,id]);return r.rowCount>0;}
 async function replaceDaily(shop,rows,context={}){const cx=await pool.connect();try{await cx.query('BEGIN');await cx.query('DELETE FROM liberient_daily WHERE shop=$1',[shop]);
  for(const row of rows)await cx.query('INSERT INTO liberient_daily(shop,day,subtotal_proxy,orders) VALUES($1,$2,$3,$4)',[shop,row.date,row.net_sales,row.orders]);
  await cx.query('UPDATE liberient_shops SET dirty=FALSE,timezone=$2,currency=$3,updated_at=now() WHERE shop=$1',[shop,context.timezone||null,context.currency||null]);await cx.query('COMMIT');
 }catch(e){await cx.query('ROLLBACK');throw e;}finally{cx.release();}}
 async function snapshot(shop){const row=await getShop(shop);if(!row)return null;
  const q=await pool.query('SELECT day::text AS date,subtotal_proxy::float8 AS net_sales,orders FROM liberient_daily WHERE shop=$1 ORDER BY day',[shop]);
  return {source:'SHOPIFY ORDER SUBTOTAL PROXY (NOT RECONCILED)',status:'HOLD',dirty:row.dirty,asOf:row.updated_at,
   daily:q.rows,hasData:q.rows.length>0,provenance:{mode:'SHOPIFY',currency:row.currency,timezone:row.timezone,source:'ORDER SUBTOTAL PROXY ONLY'},metrics:{sales:q.rows.reduce((n,r)=>n+r.net_sales,0),orders:q.rows.reduce((n,r)=>n+r.orders,0),days:q.rows.length}};}
 async function erase(shop){await pool.query('DELETE FROM liberient_shops WHERE shop=$1',[shop]);}
 return {init,getShop,saveToken,markDirty,recordWebhook,replaceDaily,snapshot,erase};
}
function postgresStorage(env=process.env){if(!isValidUrl(env.LIBERIENT_DATABASE_URL))throw Error('LIBERIENT_DATABASE_URL must be a valid PostgreSQL URL');
 const {Pool}=require('pg');const pool=new Pool({connectionString:env.LIBERIENT_DATABASE_URL,ssl:env.LIBERIENT_DB_SSL==='false'?false:{rejectUnauthorized:true},max:4,connectionTimeoutMillis:8000,query_timeout:15000});
 return {storage:createStorage({pool,env}),close:()=>pool.end()};}
function isValidUrl(v){try{const u=new URL(v);return ['postgres:','postgresql:'].includes(u.protocol)&&!!u.hostname&&!!u.username;}catch{return false}}
module.exports={SCHEMA,createStorage,postgresStorage,isValidUrl};
