import { getDb } from './server/db.ts';

const db = await getDb();
if (!db) {
  console.error('Database not available');
  process.exit(1);
}

try {
  console.log('Creating categories table...');
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ categories table created');

  console.log('Creating competitors table...');
  await db.execute(`
    CREATE TABLE IF NOT EXISTS competitors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      categoryId INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      website VARCHAR(255),
      adAccountUrl VARCHAR(255),
      notes TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ competitors table created');

  console.log('Creating competitorCreatives table...');
  await db.execute(`
    CREATE TABLE IF NOT EXISTS competitorCreatives (
      id INT AUTO_INCREMENT PRIMARY KEY,
      competitorId INT NOT NULL,
      transcriptionId INT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (competitorId) REFERENCES competitors(id) ON DELETE CASCADE,
      FOREIGN KEY (transcriptionId) REFERENCES transcriptions(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ competitorCreatives table created');

  console.log('\n✓ All tables created successfully!');
  process.exit(0);
} catch (error) {
  console.error('Error creating tables:', error.message);
  process.exit(1);
}
