import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, initDatabase } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// разрешаем браузеру делать запросы с другого порта (cors)
app.use(cors());
// чтобы сервер понимал входящие данные в формате json
app.use(express.json());

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri'];

// проверяем, был ли сотрудник на работе в выходной
function isWorkingWeekend(val) {
  if (!val) return false;
  const clean = val.trim().toLowerCase();
  return clean !== 'вых' && clean !== 'больничный' && clean !== 'отгул' && clean !== '—' && clean !== '-';
}

// считаем отгулы за неделю (+1 за работу в выходной, -1 если брал отгул в будни)
function calculateWeeklyDelta(days) {
  if (!days) return 0;
  let earned = 0;
  if (isWorkingWeekend(days.sat)) earned += 1;
  if (isWorkingWeekend(days.sun)) earned += 1;
  let spent = 0;
  for (const key of WEEKDAY_KEYS) {
    if ((days[key] || '').trim().toLowerCase() === 'отгул') spent += 1;
  }
  return earned - spent;
}

// запросы к серверу (api)

// 1. отдаем график на выбранную неделю
app.get('/api/schedule/:weekKey', async (req, res) => {
  const { weekKey } = req.params;

  try {
    const checkSchedule = await pool.query(
      'SELECT COUNT(*) FROM weekly_schedules WHERE week_key = $1',
      [weekKey]
    );
    const hasWeekData = parseInt(checkSchedule.rows[0].count, 10) > 0;

    if (hasWeekData) {
      const query = `
        SELECT 
          e.id, 
          e.name, 
          e.lunch, 
          e.time_off_balance AS "timeOffBalance",
          ws.mon, ws.tue, ws.wed, ws.thu, ws.fri, ws.sat, ws.sun, ws.note
        FROM employees e
        JOIN weekly_schedules ws ON e.id = ws.employee_id AND ws.week_key = $1
        ORDER BY e.id ASC
      `;
      const result = await pool.query(query, [weekKey]);

      const formatted = result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        lunch: row.lunch || '12.00-13.00',
        timeOffBalance: Number(row.timeOffBalance) || 0,
        note: row.note || '',
        days: {
          mon: row.mon || '8.00-17.00',
          tue: row.tue || '8.00-17.00',
          wed: row.wed || '8.00-17.00',
          thu: row.thu || '8.00-17.00',
          fri: row.fri || '8.00-17.00',
          sat: row.sat || 'Вых',
          sun: row.sun || 'Вых',
        },
      }));

      return res.json(formatted);
    }

    const latestWeekRes = await pool.query(`
      SELECT week_key FROM weekly_schedules 
      WHERE week_key < $1
      ORDER BY week_key DESC 
      LIMIT 1
    `, [weekKey]);

    if (latestWeekRes.rows.length > 0) {
      const lastWeekKey = latestWeekRes.rows[0].week_key;
      const prevDataRes = await pool.query(`
        SELECT 
          e.id, 
          e.name, 
          e.lunch, 
          e.time_off_balance AS "timeOffBalance",
          ws.mon, ws.tue, ws.wed, ws.thu, ws.fri, ws.sat, ws.sun
        FROM employees e
        LEFT JOIN weekly_schedules ws ON e.id = ws.employee_id AND ws.week_key = $1
        ORDER BY e.id ASC
      `, [lastWeekKey]);

      const carriedOver = prevDataRes.rows.map((row) => {
        const prevDays = {
          mon: row.mon || '8.00-17.00',
          tue: row.tue || '8.00-17.00',
          wed: row.wed || '8.00-17.00',
          thu: row.thu || '8.00-17.00',
          fri: row.fri || '8.00-17.00',
          sat: row.sat || 'Вых',
          sun: row.sun || 'Вых',
        };
        const delta = calculateWeeklyDelta(prevDays);

        return {
          id: row.id,
          name: row.name,
          lunch: row.lunch || '12.00-13.00',
          timeOffBalance: (Number(row.timeOffBalance) || 0) + delta,
          note: '',
          days: prevDays,
        };
      });

      return res.json(carriedOver);
    }

    const allEmployees = await pool.query('SELECT * FROM employees ORDER BY id ASC');
    const defaultList = allEmployees.rows.map((emp) => ({
      id: emp.id,
      name: emp.name,
      lunch: emp.lunch || '12.00-13.00',
      timeOffBalance: Number(emp.time_off_balance) || 0,
      note: '',
      days: {
        mon: '8.00-17.00',
        tue: '8.00-17.00',
        wed: '8.00-17.00',
        thu: '8.00-17.00',
        fri: '8.00-17.00',
        sat: 'Вых',
        sun: 'Вых',
      },
    }));

    return res.json(defaultList);
  } catch (error) {
    console.error('Ошибка получения графика:', error);
    res.status(500).json({ message: 'Ошибка получения графика из базы данных' });
  }
});

// 2. сохраняем график недели в базу данных
app.post('/api/schedule/:weekKey', async (req, res) => {
  const { weekKey } = req.params;
  const employees = req.body;

  if (!Array.isArray(employees)) {
    return res.status(400).json({ message: 'Ожидается массив сотрудников' });
  }

  const client = await pool.connect();
  try {

    await client.query('BEGIN');

    for (const emp of employees) {
      await client.query(`
        UPDATE employees 
        SET name = $1, lunch = $2, time_off_balance = $3
        WHERE id = $4
      `, [emp.name, emp.lunch, emp.timeOffBalance || 0, emp.id]);

      const d = emp.days || {};
      await client.query(`
        INSERT INTO weekly_schedules (
          week_key, employee_id, mon, tue, wed, thu, fri, sat, sun, note
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (week_key, employee_id)
        DO UPDATE SET
          mon = EXCLUDED.mon,
          tue = EXCLUDED.tue,
          wed = EXCLUDED.wed,
          thu = EXCLUDED.thu,
          fri = EXCLUDED.fri,
          sat = EXCLUDED.sat,
          sun = EXCLUDED.sun,
          note = EXCLUDED.note
      `, [
        weekKey,
        emp.id,
        d.mon || '8.00-17.00',
        d.tue || '8.00-17.00',
        d.wed || '8.00-17.00',
        d.thu || '8.00-17.00',
        d.fri || '8.00-17.00',
        d.sat || 'Вых',
        d.sun || 'Вых',
        emp.note || '',
      ]);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'График успешно сохранен в базе данных' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка сохранения графика:', error);
    res.status(500).json({ message: 'Ошибка сохранения графика в базу данных' });
  } finally {
    client.release();
  }
});

// 3. добавляем нового сотрудника
app.post('/api/employees', async (req, res) => {
  const { name, lunch = '12.00-13.00', timeOffBalance = 0 } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Ф.И.О. обязательно для заполнения' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO employees (name, lunch, time_off_balance)
      VALUES ($1, $2, $3)
      RETURNING id, name, lunch, time_off_balance AS "timeOffBalance"
    `, [name.trim(), lunch.trim(), Number(timeOffBalance) || 0]);

    const created = result.rows[0];
    res.status(201).json({
      id: created.id,
      name: created.name,
      lunch: created.lunch,
      timeOffBalance: created.timeOffBalance,
      note: '',
      days: {
        mon: '8.00-17.00',
        tue: '8.00-17.00',
        wed: '8.00-17.00',
        thu: '8.00-17.00',
        fri: '8.00-17.00',
        sat: 'Вых',
        sun: 'Вых',
      },
    });
  } catch (error) {
    console.error('Ошибка создания сотрудника:', error);
    res.status(500).json({ message: 'Ошибка добавления сотрудника в базу данных' });
  }
});

// 4. удаляем сотрудника по id
app.delete('/api/employees/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM employees WHERE id = $1', [id]);
    res.json({ success: true, message: 'Сотрудник успешно удален из базы данных' });
  } catch (error) {
    console.error('Ошибка удаления сотрудника:', error);
    res.status(500).json({ message: 'Ошибка удаления сотрудника из базы данных' });
  }
});

async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Бэкенд-сервер запущен: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Не удалось запустить сервер из-за ошибки БД:', error.message);
  }
}

startServer();
