const mysql = require('mysql2');
require('dotenv').config(); // Supaya bisa baca file .env atau Variables Railway

const db = mysql.createConnection({
  host: process.env.DB_HOST,     // Mengambil data dari variabel DB_HOST di Railway
  user: process.env.DB_USER,     // Mengambil data dari variabel DB_USER di Railway
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
});

db.connect((err) => {
  if (err) {
    console.error('Gagal koneksi ke database Railway:', err.message);
    return;
  }
  console.log('Mantap! Berhasil konek ke Database Railway.');
});

module.exports = db;