import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// подключаемся к базе postgresql
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'cit_schedule',
});

// создаем таблицы при первом запуске, если их еще нет
export async function initDatabase() {
  const client = await pool.connect();
  try {
    // таблица сотрудников (имя, обед, баланс отгулов)
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        lunch VARCHAR(50) DEFAULT '12.00-13.00',
        time_off_balance INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // таблица расписания по неделям
    await client.query(`
      CREATE TABLE IF NOT EXISTS weekly_schedules (
        id SERIAL PRIMARY KEY,
        week_key VARCHAR(20) NOT NULL,
        employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        mon VARCHAR(50) DEFAULT '8.00-17.00',
        tue VARCHAR(50) DEFAULT '8.00-17.00',
        wed VARCHAR(50) DEFAULT '8.00-17.00',
        thu VARCHAR(50) DEFAULT '8.00-17.00',
        fri VARCHAR(50) DEFAULT '8.00-17.00',
        sat VARCHAR(50) DEFAULT 'Вых',
        sun VARCHAR(50) DEFAULT 'Вых',
        note VARCHAR(255) DEFAULT '',
        CONSTRAINT unique_week_employee UNIQUE (week_key, employee_id)
      );
    `);

    // смотрим, есть ли уже записи в таблице
    const checkRes = await client.query('SELECT COUNT(*) FROM employees');
    const count = parseInt(checkRes.rows[0].count, 10);

    // если таблица пустая, заполняем начальными сотрудниками
    if (count === 0) {
      console.log('🌱 Заполняем базу данных начальными сотрудниками ЦИТ...');
      const initialSeed = [
        { name: 'Ерусалимов В.В.', lunch: '12.00-13.00', balance: 0 },
        { name: 'Юрченко Н.В.', lunch: '12.00-13.00', balance: 0 },
        { name: 'Зуева В.Н.', lunch: '16.00-17.00', balance: 0 },
        { name: 'Шарпалёв М.В.', lunch: '12.00-13.00', balance: 0 },
        { name: 'Шлепоченко М.А.', lunch: '12.00-13.00', balance: 0 },
      ];

      for (const emp of initialSeed) {
        await client.query(
          'INSERT INTO employees (name, lunch, time_off_balance) VALUES ($1, $2, $3)',
          [emp.name, emp.lunch, emp.balance]
        );
      }
      console.log('✅ Начальные сотрудники успешно добавлены в PostgreSQL');
    }
  } catch (error) {
    console.error('❌ Ошибка инициализации базы данных:', error.message);
    throw error;
  } finally {
    // отпускаем клиента обратно в пул
    client.release();
  }
}
