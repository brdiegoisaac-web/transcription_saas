import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [competitors] = await connection.execute('SELECT * FROM competitors ORDER BY id DESC LIMIT 5');
console.log('Competitors:', JSON.stringify(competitors, null, 2));

await connection.end();
