'use strict';
// SQLite-backed reproducible two-month demonstration. Free Render hosts have ephemeral storage;
// the fixture is recreated deterministically on restart and rolled to 60 completed days at UTC midnight.
const {DatabaseSync}=require('node:sqlite');
const Demo=require('../experience/demo60.js');
function createDemoDatabase({now=()=>new Date()}={}){
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE store (id INTEGER PRIMARY KEY, name TEXT NOT NULL, mode TEXT NOT NULL);
 CREATE TABLE daily_business (day TEXT PRIMARY KEY, net_sales REAL NOT NULL, orders INTEGER NOT NULL,
 refunds REAL NOT NULL, new_customers INTEGER NOT NULL, returning_customers INTEGER NOT NULL,
 inventory_units INTEGER NOT NULL, stockout_products INTEGER NOT NULL, phase TEXT NOT NULL);`);
 db.prepare('INSERT INTO store (id,name,mode) VALUES (1,?,?)').run('LIBERIENT Sample Store','SYNTHETIC');
 const insert=db.prepare(`INSERT INTO daily_business(day,net_sales,orders,refunds,new_customers,returning_customers,inventory_units,stockout_products,phase)
 VALUES(?,?,?,?,?,?,?,?,?)`);
 const query=db.prepare(`SELECT day AS date,net_sales,orders,refunds,new_customers,returning_customers,inventory_units,stockout_products,phase
 FROM daily_business ORDER BY day ASC`);
 const count=db.prepare('SELECT COUNT(*) AS total, MIN(day) AS first, MAX(day) AS last FROM daily_business');
 let seeded='';
 function refresh(){
  const day=Demo.lastComplete(now());if(day===seeded)return;
  const fixture=Demo.generate(day);
  db.exec('BEGIN TRANSACTION');
  try{db.exec('DELETE FROM daily_business');for(const r of fixture.daily)insert.run(r.date,r.net_sales,r.orders,r.refunds,r.new_customers,r.returning_customers,r.inventory_units,r.stockout_products,r.phase);db.exec('COMMIT');seeded=day;}
  catch(e){db.exec('ROLLBACK');throw e;}
 }
 function snapshot(){refresh();const rows=query.all().map(r=>({...r,stockout:r.stockout_products>0}));const c=count.get();if(c.total!==60)throw Error('Demo database incomplete');return {...Demo.generate(seeded),daily:rows,database:{engine:'SQLite',rows:c.total,first:c.first,last:c.last,resetPolicy:'reproducibly regenerated on host restart; sample only'}};}
 refresh();return {snapshot,close:()=>db.close()};
}
module.exports={createDemoDatabase};
