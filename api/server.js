const express = require('express');
const cors = require('cors');
const app = express();

const allowed = ['https://layerseven.tech','https://www.layerseven.tech'];
app.use(cors({
  origin: (o, cb) => !o || allowed.includes(o) ? cb(null, true) : cb(new Error('CORS blocked')),
}));
app.use(express.json());

app.get('/health', (_,res)=>res.json({ok:true, ts:new Date().toISOString()}));
app.get('/hello',  (_,res)=>res.json({msg:'hi from api.layerseven.tech'}));

app.listen(3000, ()=>console.log('API on :3000'));
