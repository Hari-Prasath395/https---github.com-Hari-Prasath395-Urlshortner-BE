const express = require('express');
const appServer = express();
const shortRouteController = require('./Routes/shortRouter');
const usersController = require('./Routes/Users');

appServer.use('/api',shortRouteController);
appServer.use('/user',usersController);

module.exports = appServer;




