import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Button,
  Paper,
  Group,
  Stack,
  ActionIcon,
  Box,
  Tooltip,
  TextInput,
  Modal,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconDeviceFloppy,
  IconPrinter,
  IconChevronsLeft,
  IconChevronsRight,
  IconUserPlus,
  IconSearch,
} from '@tabler/icons-react';

import './styles/print.css';
import { api } from './services/api';
import { ScheduleTable } from './components/ScheduleTable';
import { AddEmployeeModal } from './components/AddEmployeeModal';
import { PrintSchedule } from './components/PrintSchedule';
import {
  getMonday,
  getSunday,
  formatDateRu,
  formatWeekKey,
  addWeeks,
} from './utils/dateUtils';

function App() {
  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));

  const currentSunday = getSunday(currentMonday);
  const weekKey = formatWeekKey(currentMonday);

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [printModalOpened, { open: openPrintModal, close: closePrintModal }] = useDisclosure(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [signDate, setSignDate] = useState(() => formatDateRu(new Date()));

  useEffect(() => {
    setLoading(true);
    api.getSchedule(weekKey).then((data) => {
      setEmployees(data);
      setLoading(false);
    });
  }, [weekKey]);

  const handlePrevWeek = () => setCurrentMonday((prev) => addWeeks(prev, -1));
  const handleNextWeek = () => setCurrentMonday((prev) => addWeeks(prev, 1));
  const handleTodayWeek = () => setCurrentMonday(getMonday(new Date()));

  const handleAddEmployee = (newEmployee) => {
    setEmployees((prev) => [...prev, newEmployee]);
  };

  const handleUpdateEmployee = (id, updaterFn) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? updaterFn(emp) : emp))
    );
  };

  const handleBatchUpdateDays = (updatesByEmpId) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        const patch = updatesByEmpId[emp.id];
        if (!patch) return emp;
        return {
          ...emp,
          days: {
            ...emp.days,
            ...patch,
          },
        };
      })
    );
  };

  const handleDeleteEmployee = (id) => {
    setEmployees((prev) => prev.filter((emp) => emp.id !== id));
  };

  const handleSave = () => {
    api.saveSchedule(weekKey, employees);
  };

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const filteredEmployees = trimmedQuery
    ? employees.filter((emp) => (emp.name || '').toLowerCase().includes(trimmedQuery))
    : employees;

  const handleConfirmPrint = (e) => {
    if (e) e.preventDefault();
    closePrintModal();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <>
      <div className="screen-only">
        <Container size="xl" py="xl">
          <Stack gap="lg">
            <Paper shadow="xs" p="md" withBorder>
              <Group justify="space-between" wrap="wrap" gap="md">
                <div>
                  <Title order={2}>График работы сотрудников ЦИТ</Title>
                  <Text c="dimmed" size="sm">
                    УО «ВГТУ» • Информационно-вычислительный центр
                  </Text>
                </div>

                <Group gap={6} align="center">
                  <Tooltip label="Предыдущая неделя">
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="md"
                      onClick={handlePrevWeek}
                    >
                      <IconChevronsLeft size={18} stroke={1.5} />
                    </ActionIcon>
                  </Tooltip>

                  <Tooltip label="Нажмите, чтобы вернуться к текущей неделе">
                    <Box
                      onClick={handleTodayWeek}
                      style={{
                        border: '1px solid #ced4da',
                        borderRadius: '6px',
                        padding: '3px 10px',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        userSelect: 'none',
                        backgroundColor: '#ffffff',
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#228be6')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#ced4da')}
                    >
                      {formatDateRu(currentMonday)} - {formatDateRu(currentSunday)}
                    </Box>
                  </Tooltip>

                  <Tooltip label="Следующая неделя">
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="md"
                      onClick={handleNextWeek}
                    >
                      <IconChevronsRight size={18} stroke={1.5} />
                    </ActionIcon>
                  </Tooltip>
                </Group>

                <Group gap="xs">
                  <Button
                    leftSection={<IconUserPlus size={18} />}
                    variant="light"
                    color="blue"
                    onClick={openModal}
                  >
                    Добавить сотрудника
                  </Button>

                  <Button
                    leftSection={<IconDeviceFloppy size={18} />}
                    color="teal"
                    onClick={handleSave}
                  >
                    Сохранить в БД
                  </Button>

                  <Button
                    leftSection={<IconPrinter size={18} />}
                    color="blue"
                    onClick={openPrintModal}
                  >
                    Печать
                  </Button>
                </Group>
              </Group>
            </Paper>

            <Paper shadow="xs" p="md" withBorder>
              <TextInput
                placeholder="Поиск по Ф.И.О."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="sm"
                style={{ maxWidth: 320 }}
                mb="sm"
              />

              {loading ? (
                <Text c="dimmed" ta="center" py="xl">
                  Загрузка графика недели...
                </Text>
              ) : (
                <ScheduleTable
                  employees={filteredEmployees}
                  onUpdateEmployee={handleUpdateEmployee}
                  onBatchUpdateDays={handleBatchUpdateDays}
                  onDeleteEmployee={handleDeleteEmployee}
                />
              )}
            </Paper>
          </Stack>

          <AddEmployeeModal
            opened={modalOpened}
            onClose={closeModal}
            onAddEmployee={handleAddEmployee}
          />

          <Modal
            opened={printModalOpened}
            onClose={closePrintModal}
            title="Параметры печати"
            centered
            size="sm"
          >
            <form onSubmit={handleConfirmPrint}>
              <Stack gap="md">
                <TextInput
                  label="Дата подписания"
                  placeholder="ДД.ММ.ГГГГ"
                  value={signDate}
                  onChange={(e) => setSignDate(e.target.value)}
                />
                <Group justify="flex-end" gap="xs">
                  <Button variant="default" onClick={closePrintModal}>
                    Отмена
                  </Button>
                  <Button type="submit" leftSection={<IconPrinter size={16} />} color="blue">
                    Сформировать печать
                  </Button>
                </Group>
              </Stack>
            </form>
          </Modal>
        </Container>
      </div>

      <PrintSchedule
        employees={employees}
        currentMonday={currentMonday}
        currentSunday={currentSunday}
        signDate={signDate}
      />
    </>
  );
}

export default App;
