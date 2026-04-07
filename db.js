const mysql = require('mysql2');

const db = mysql.createConnection({
host: 'localhost',
user: 'root',
password: '',
database: 'db_express'
});

module.exports = db;
