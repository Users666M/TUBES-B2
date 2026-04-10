const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./db'); 
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'rahasia_ketua_angkatan_2024',
    resave: false,
    saveUninitialized: true
}));

// --- ALUR HALAMAN (GET) ---
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => res.render('login'));
app.get('/register', (req, res) => res.render('register'));

// --- LOGIKA PROSES (POST) ---

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const role = 'user'; 
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
        db.query(sql, [username, hashedPassword, role], (err) => {
            if (err) return res.send("Gagal Daftar (Username mungkin sudah ada): " + err.message);
            res.send('<script>alert("Berhasil Daftar! Silakan Login."); window.location="/login";</script>');
        });
    } catch (e) { res.status(500).send("Error Server"); }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            const match = await bcrypt.compare(password, results[0].password);
            if (match) {
                req.session.username = results[0].username;
                req.session.role = results[0].role;
                if (results[0].role === 'admin') {
                    return res.redirect('/admin/dashboard');
                } else {
                    return res.redirect('/user/home');
                }
            }
        }
        return res.send("<script>alert('Login Gagal! Akun tidak ditemukan.'); window.location='/login';</script>");
    });
});

// --- FITUR ADMIN ---

app.get('/admin/dashboard', (req, res) => {
    if (req.session.role !== 'admin') return res.send("Akses Ditolak! Anda bukan Admin.");
    db.query('SELECT COUNT(*) AS total FROM users', (err, results) => {
        if (err) throw err;
        res.render('dashboard', { 
            nama: req.session.username, 
            statistik: results[0].total 
        });
    });
});

app.get('/admin/songs', (req, res) => {
    if (req.session.role !== 'admin') return res.redirect('/login');
    db.query('SELECT * FROM songs', (err, results) => {
        if (err) throw err;
        res.render('admin_songs', { nama: req.session.username, songs: results });
    });
});

app.post('/admin/songs/add', (req, res) => {
    // 1. Tambahkan image_url di sini
    const { title, artist, url, lyrics, image_url } = req.body; 
    
    // 2. Tambahkan kolom image_url dan tanda tanya (?) jadi 5
    db.query('INSERT INTO songs (title, artist, url, lyrics, image_url) VALUES (?, ?, ?, ?, ?)', 
    [title, artist, url, lyrics, image_url], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Gagal menambah lagu');
        }
        res.redirect('/admin/songs');
    });
});

app.get('/admin/songs/delete/:id', (req, res) => {
    if (req.session.role !== 'admin') return res.redirect('/login');
    db.query('DELETE FROM songs WHERE id = ?', [req.params.id], (err) => {
        if (err) throw err;
        res.redirect('/admin/songs');
    });
});

// Route untuk tampilkan halaman edit
app.get('/admin/songs/edit/:id', (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM songs WHERE id = ?', [id], (err, results) => {
        if (err) throw err;
        res.render('edit_song', { song: results[0] });
    });
});

// Route untuk proses simpan hasil edit
app.post('/admin/songs/update/:id', (req, res) => {
    const { id } = req.params;
    const { title, artist, url, lyrics, image_url } = req.body;
    const query = 'UPDATE songs SET title=?, artist=?, url=?, lyrics=?, image_url=? WHERE id=?';
    db.query(query, [title, artist, url, lyrics, image_url, id], (err) => {
        if (err) throw err;
        res.redirect('/admin/songs');
    });
});
// --- [ADMIN] LIHAT DAFTAR USER ---
// Rute untuk menampilkan daftar user (Pemicu "Cannot GET" tadi)
app.get('/admin/users', (req, res) => {
    // Proteksi: Hanya admin yang boleh buka
    if (req.session.role !== 'admin') return res.redirect('/login');
    
    // Ambil data user dan gabungkan dengan lagu favorit mereka
    const sql = `
        SELECT u.username, u.password, 
        (SELECT GROUP_CONCAT(s.title SEPARATOR ', ') 
         FROM favorites f 
         JOIN songs s ON f.song_id = s.id 
         WHERE f.username = u.username) AS koleksi_favorit
        FROM users u WHERE u.role = 'user'`;

    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.send("Gagal mengambil data user");
        }
        // Render file admin_users.ejs
        res.render('admin_users', { 
            nama: req.session.username, 
            users: results 
        });
    });
});

// --- [USER] PROSES TAMBAH FAVORIT ---
app.get('/user/favorite/:id', (req, res) => {
    if (!req.session.username) return res.redirect('/login');
    const song_id = req.params.id;
    const username = req.session.username;

    // Cek dulu apakah sudah pernah difavoritkan biar tidak double
    db.query('SELECT * FROM favorites WHERE username = ? AND song_id = ?', [username, song_id], (err, results) => {
        if (results.length === 0) {
            db.query('INSERT INTO favorites (username, song_id) VALUES (?, ?)', [username, song_id], (err) => {
                res.redirect('/user/home');
            });
        } else {
            res.redirect('/user/home');
        }
    });
});
// --- FITUR USER ---

app.get('/user/home', (req, res) => {
    if (!req.session.username) return res.redirect('/login');
    
    db.query('SELECT * FROM songs', (err, results) => {
        if (err) {
            console.error("Error Database:", err);
            return res.send("Terjadi kesalahan pada database.");
        }
        res.render('user_home', { 
            nama: req.session.username, 
            songs: results 
        });
    });
});

app.get('/user/favorite/:id', (req, res) => {
    const song_id = req.params.id;
    const username = req.session.username;
    db.query('INSERT INTO favorites (username, song_id) VALUES (?, ?)', [username, song_id], (err) => {
        res.redirect('/user/home');
    });
});

// --- LOGOUT & LISTEN ---

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

app.listen(3000, '0.0.0.0', () => {
    console.log("========================================");
    console.log("SERVER BERHASIL NYALA!");
    console.log("Buka di: http://localhost:3000/login");
    console.log("========================================");
});

// Baris paling bawah di app.js
module.exports = app;