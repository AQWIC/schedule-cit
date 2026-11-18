import axios from 'axios';
import { notifications } from '@mantine/notifications';
import { INITIAL_EMPLOYEES } from '../mock/initialData';

const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api', // Адрес нашего бэкенда Express + PostgreSQL
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

// работа в выходной?
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

// подсчёт дельты отгулов
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
  // Получить график недели из PostgreSQL (с автоматическим фоллбэком на локальные данные при выключенном сервере)
  async getSchedule(weekKey) {
    try {
      const response = await apiClient.get(`/schedule/${weekKey}`);
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        return response.data;
      }
    } catch (e) {
      console.warn('Сервер недоступен, используем локальное хранилище:', e.message);
    }

    // Фоллбэк на localStorage, если бэкенд не запущен
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const weeksData = JSON.parse(saved);
        if (weeksData && weeksData[weekKey]) {
          return weeksData[weekKey];
        }
      } catch (err) {
        console.error(err);
      }
    }
    return INITIAL_EMPLOYEES;
  },

  // Сохранить график недели в PostgreSQL
  async saveSchedule(weekKey, employees) {
    try {
      await apiClient.post(`/schedule/${weekKey}`, employees);
      notifications.show({
        color: 'teal',
        title: 'Успешно',
        message: `График на неделю ${weekKey} сохранён в базе данных PostgreSQL`,
        autoClose: 3000,
      });
      return true;
    } catch (e) {
      console.warn('Не удалось сохранить на сервер, сохраняем в localStorage:', e.message);
      // Дублируем в localStorage для надежности
      let weeksData = {};
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          weeksData = JSON.parse(saved);
        } catch (err) {
          weeksData = {};
        }
      }
      weeksData[weekKey] = employees;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(weeksData));
      return true;
    }
  },

  client: apiClient,
};
