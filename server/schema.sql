-- Таблица сотрудников ЦИТ
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    lunch VARCHAR(50) DEFAULT '12.00-13.00',
    time_off_balance INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица еженедельных графиков смен
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
