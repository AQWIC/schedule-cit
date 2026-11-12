import axios from 'axios';
import { notifications } from '@mantine/notifications';
import { INITIAL_EMPLOYEES } from '../mock/initialData';

const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// перехватчик ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Ошибка сети';
    notifications.show({
      color: 'red',
      title: 'Ошибка соединения с сервером',
      message: message,
      autoClose: 4000,
    });
    return Promise.reject(error);
  }
);

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri'];

// работа в выходно?
export function isWorkingWeekend(val) {
  if (!val) return false;
  const clean = val.trim().toLowerCase();
  return (
    clean !== 'вых' &&
    clean !== 'выходной' &&
    clean !== 'больничный' &&
    clean !== 'бол' &&
    clean !== 'отгул' &&
    clean !== '—' &&
    clean !== '-'
  );
}

// подсчёт отгулов
export function calculateWeeklyDelta(days) {
  if (!days) return 0;

  let earned = 0;
  if (isWorkingWeekend(days.sat)) earned += 1;
  if (isWorkingWeekend(days.sun)) earned += 1;

  let spent = 0;
  for (const key of WEEKDAY_KEYS) {
    if ((days[key] || '').trim().toLowerCase() === 'отгул') {
      spent += 1;
    }
  }

  return earned - spent;
}

const STORAGE_KEY = 'cit_schedule_weeks';

export const api = {
  async getSchedule(weekKey) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const weeksData = JSON.parse(saved);

        if (weeksData && weeksData[weekKey]) {
          return weeksData[weekKey];
        }

        // если неделя новая, переносим отгулы
        const existingKeys = Object.keys(weeksData).sort();
        if (existingKeys.length > 0) {
          const lastKey = existingKeys[existingKeys.length - 1];
          const lastEmployees = weeksData[lastKey];

          if (Array.isArray(lastEmployees) && lastEmployees.length > 0) {
            return lastEmployees.map((emp) => ({
              id: emp.id,
              name: emp.name,
              lunch: emp.lunch || '12.00-13.00',
              note: '',
              timeOffBalance: (Number(emp.timeOffBalance) || 0) + calculateWeeklyDelta(emp.days),
              days: emp.days
                ? { ...emp.days }
                : {
                    mon: '8.00-17.00',
                    tue: '8.00-17.00',
                    wed: '8.00-17.00',
                    thu: '8.00-17.00',
                    fri: '8.00-17.00',
                    sat: 'Вых',
                    sun: 'Вых',
                  },
            }));
          }
        }
      } catch (e) {
        console.error('Ошибка чтения данных недели', e);
      }
    }

    return INITIAL_EMPLOYEES;
  },

  async saveSchedule(weekKey, employees) {
    let weeksData = {};
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          weeksData = parsed;
        }
      } catch (e) {
        weeksData = {};
      }
    }

    weeksData[weekKey] = employees;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weeksData));

    notifications.show({
      color: 'teal',
      title: 'Успешно',
      message: `График на неделю ${weekKey} сохранён в базе данных`,
      autoClose: 3000,
    });

    return true;
  },

  client: apiClient,
};
