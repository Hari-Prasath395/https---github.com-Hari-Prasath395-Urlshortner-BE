const express = require('express');
const nodeServer = express();
const appServer = require('./app');
const bodyParser =require('body-parser');
const cors= require('cors');
require('./dbconfig');

nodeServer.use(bodyParser.json());
nodeServer.use(bodyParser.urlencoded({ extended: true }));
nodeServer.use(cors());

nodeServer.use('/',appServer);


const port = 8000;
nodeServer.listen(port,()=>{
    console.log(`Server started on port ${port}`);
})