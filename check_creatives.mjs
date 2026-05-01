import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [creatives] = await connection.execute('SELECT * FROM competitorCreatives ORDER BY id DESC LIMIT 10');
console.log('Competitor Creatives:', JSON.stringify(creatives, null, 2));

await connection.end();
