// Script untuk convert dari callback-based ke async/await dengan connection pool
// Ini adalah contoh pattern yang bisa digunakan untuk refactor

const mysql = require('mysql2/promise');

// Contoh pattern migration:
// SEBELUM (callback):
// db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
//   if (err) return res.status(500).json({ error: err.message });
//   res.json(results);
// });

// SESUDAH (async/await dengan pool):
// const [results] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
// res.json(results);

console.log('Migration guide:');
console.log('1. Ganti mysql.createConnection -> mysql.createPool');
console.log('2. Ganti db.query(callback) -> await pool.query()');
console.log('3. Wrap dalam try-catch untuk error handling');
console.log('4. Gunakan destructuring: const [results] = await pool.query(...)');
