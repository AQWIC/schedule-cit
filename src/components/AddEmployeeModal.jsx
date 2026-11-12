import React, { useState } from 'react';
import {
  Modal,
  TextInput,
  NumberInput,
  Button,
  Group,
  Stack,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

function cleanFio(raw) {
  if (!raw) return '';
  let cleaned = raw.trim().replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/([А-ЯЁA-Z]\.)\s+([А-ЯЁA-Z]\.)/g, '$1$2');
  return cleaned;
}

export function AddEmployeeModal({ opened, onClose, onAddEmployee }) {
  const [name, setName] = useState('');
  const [timeOffBalance, setTimeOffBalance] = useState(0);
  const [error, setError] = useState('');

  const handleBlur = () => {
    if (name) {
      setName(cleanFio(name));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const formattedName = cleanFio(name);

    if (!formattedName) {
      setError('Пожалуйста, укажите Ф.И.О. сотрудника');
      return;
    }

    const newEmployee = {
      id: Date.now(),
      name: formattedName,
      timeOffBalance: Number(timeOffBalance) || 0,
      lunch: '12.00-13.00',
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
    };

    onAddEmployee(newEmployee);

    notifications.show({
      color: 'teal',
      title: 'Сотрудник добавлен',
      message: `${newEmployee.name} успешно внесен в график`,
    });

    setName('');
    setTimeOffBalance(0);
    setError('');
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Добавить сотрудника в график"
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Ф.И.О. сотрудника"
            placeholder="например, Иванов И.И."
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            onBlur={handleBlur}
            error={error}
          />

          <NumberInput
            label="Начальный баланс отгулов"
            min={0}
            max={50}
            value={timeOffBalance}
            onChange={setTimeOffBalance}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" color="blue">
              Добавить в таблицу
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
